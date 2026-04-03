import { Router, Request, Response, NextFunction } from "express";
import { body, query, validationResult } from "express-validator";
import multer from "multer";
import { Product } from "../models/product.model";
import { Category } from "../models/category.model";
import { extractUser, requirePermission } from "../middleware/permissions";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  PERMISSIONS,
  getPlanLimit,
} from "@pharmacy-saas/shared";
import { publishEvent } from "@pharmacy-saas/rabbitmq";
import { EVENTS } from "@pharmacy-saas/shared";
import { uploadImage, deleteImage } from "../utils/cloudinary";
import { mongoose } from "@pharmacy-saas/db";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.originalname.endsWith(".csv")
    )
      cb(null, true);
    else cb(new Error("Only CSV files are allowed"));
  },
});

export const productRoutes = Router();
productRoutes.use(extractUser);

const validate = (req: Request, _res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return next(
      new BadRequestError(
        errors
          .array()
          .map((e) => e.msg)
          .join(", "),
      ),
    );
  next();
};

// GET /api/inventory/products
productRoutes.get(
  "/",
  requirePermission(PERMISSIONS.INVENTORY_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = (req as any).user;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const search = req.query.search as string;
      const category = req.query.category as string;

      const filter: any = { tenantId };
      const status = req.query.status as string;
      if (status === "inactive") {
        filter.isActive = false;
      } else if (status !== "all") {
        filter.isActive = true;
      }
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: "i" } },
          { genericName: { $regex: search, $options: "i" } },
          { sku: { $regex: search, $options: "i" } },
          { barcode: search },
        ];
      }
      if (category) filter.categoryId = category;
      const stock = req.query.stock as string;
      if (stock === "low") {
        filter.totalStock = { $gt: 0 };
        filter.$expr = { $lte: ["$totalStock", "$reorderLevel"] };
      } else if (stock === "out") {
        filter.totalStock = 0;
      } else if (stock === "in") {
        filter.$expr = { $gt: ["$totalStock", "$reorderLevel"] };
      }
      const from = req.query.from as string;
      const to = req.query.to as string;
      if (from || to) {
        filter.createdAt = {};
        if (from) filter.createdAt.$gte = new Date(from + "T00:00:00");
        if (to) filter.createdAt.$lte = new Date(to + "T23:59:59.999");
      }

      const skip = (page - 1) * limit;
      const [products, total] = await Promise.all([
        Product.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
        Product.countDocuments(filter),
      ]);

      res.json({
        success: true,
        data: products,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/inventory/products/:id
productRoutes.get(
  "/:id",
  requirePermission(PERMISSIONS.INVENTORY_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = (req as any).user;
      const product = await Product.findOne({ _id: req.params.id, tenantId });
      if (!product) return next(new NotFoundError("Product not found"));
      res.json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/inventory/products
productRoutes.post(
  "/",
  requirePermission(PERMISSIONS.INVENTORY_CREATE),
  [
    body("name").trim().notEmpty().withMessage("Product name required"),
    body("sku").trim().notEmpty().withMessage("SKU required"),
    body("unit").trim().notEmpty().withMessage("Unit required"),
    body("costPrice")
      .isFloat({ min: 0 })
      .withMessage("Valid cost price required"),
    body("sellingPrice")
      .isFloat({ min: 0 })
      .withMessage("Valid selling price required"),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = (req as any).user;

      // Enforce plan product limit
      const db = mongoose.connection.db;
      if (db) {
        const tid = new mongoose.Types.ObjectId(tenantId);
        const [tenant, productCount] = await Promise.all([
          db
            .collection("tenants")
            .findOne(
              { _id: tid },
              { projection: { "subscription.planId": 1 } },
            ),
          Product.countDocuments({ tenantId, isActive: true }),
        ]);
        const planId = tenant?.subscription?.planId || "free";
        const maxProducts = getPlanLimit(planId, "maxProducts");
        if (productCount >= maxProducts) {
          return next(
            new ForbiddenError(
              `Your ${planId} plan allows up to ${maxProducts} product(s). Please upgrade to add more.`,
            ),
          );
        }
      }

      // Check for duplicate name + strength combination
      const existingByName = await Product.findOne({
        tenantId,
        name: req.body.name,
        strength: req.body.strength || "",
        isActive: true,
      });
      if (existingByName) {
        return next(
          new BadRequestError(
            "A product with the same name and strength already exists",
          ),
        );
      }

      const product = await Product.create({ ...req.body, tenantId });

      try {
        await publishEvent(EVENTS.INVENTORY_PRODUCT_CREATED, {
          productId: product._id,
          tenantId,
          name: product.name,
        });
      } catch {
        /* non-critical */
      }

      res
        .status(201)
        .json({ success: true, message: "Product created", data: product });
    } catch (err: any) {
      if (err.code === 11000)
        return next(new BadRequestError("SKU already exists"));
      next(err);
    }
  },
);

// PATCH /api/inventory/products/:id
productRoutes.patch(
  "/:id",
  requirePermission(PERMISSIONS.INVENTORY_UPDATE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = (req as any).user;
      const product = await Product.findOneAndUpdate(
        { _id: req.params.id, tenantId },
        req.body,
        { new: true, runValidators: true },
      );
      if (!product) return next(new NotFoundError("Product not found"));
      res.json({ success: true, message: "Product updated", data: product });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/inventory/products/:id/toggle-status
productRoutes.patch(
  "/:id/toggle-status",
  requirePermission(PERMISSIONS.INVENTORY_UPDATE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = (req as any).user;
      const product = await Product.findOne({ _id: req.params.id, tenantId });
      if (!product) return next(new NotFoundError("Product not found"));
      product.isActive = !product.isActive;
      await product.save();
      res.json({
        success: true,
        message: product.isActive ? "Product enabled" : "Product disabled",
        data: product,
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/inventory/products/:id/images — upload images
productRoutes.post(
  "/:id/images",
  requirePermission(PERMISSIONS.INVENTORY_UPDATE),
  upload.array("images", 5),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = (req as any).user;
      const product = await Product.findOne({ _id: req.params.id, tenantId });
      if (!product) return next(new NotFoundError("Product not found"));

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0)
        return next(new BadRequestError("No images provided"));

      const currentCount = (product as any).images?.length || 0;
      if (currentCount + files.length > 5)
        return next(new BadRequestError("Maximum 5 images per product"));

      const uploaded = await Promise.all(
        files.map((f) =>
          uploadImage(f.buffer, `pharmacy/products/${tenantId}`),
        ),
      );

      const updatedProduct = await Product.findByIdAndUpdate(
        req.params.id,
        { $push: { images: { $each: uploaded } } },
        { new: true },
      );

      res.json({ success: true, data: updatedProduct });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/inventory/products/:id/images/:publicId — delete an image
productRoutes.delete(
  "/:id/images/:publicId(*)",
  requirePermission(PERMISSIONS.INVENTORY_UPDATE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = (req as any).user;
      const product = await Product.findOne({ _id: req.params.id, tenantId });
      if (!product) return next(new NotFoundError("Product not found"));

      const publicId = req.params.publicId;
      await deleteImage(publicId);

      const updatedProduct = await Product.findByIdAndUpdate(
        req.params.id,
        { $pull: { images: { publicId } } },
        { new: true },
      );

      res.json({ success: true, data: updatedProduct });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/inventory/products/import — bulk import products from CSV
productRoutes.post(
  "/import",
  requirePermission(PERMISSIONS.INVENTORY_CREATE),
  csvUpload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = (req as any).user;
      const file = req.file;
      if (!file) return next(new BadRequestError("CSV file is required"));

      const content = file.buffer.toString("utf-8");
      const lines = content.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2)
        return next(
          new BadRequestError(
            "CSV must have a header row and at least one data row",
          ),
        );

      // Parse header
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const required = ["name", "sku", "unit", "costprice", "sellingprice"];
      for (const r of required) {
        if (!headers.includes(r))
          return next(new BadRequestError(`Missing required column: ${r}`));
      }

      // Build category lookup
      const categories = await Category.find({ tenantId });
      const categoryMap = new Map(
        categories.map((c: any) => [c.name.toLowerCase(), c._id]),
      );

      const results = { created: 0, skipped: 0, errors: [] as string[] };

      for (let i = 1; i < lines.length; i++) {
        // Simple CSV parse (handles quoted fields)
        const values: string[] = [];
        let current = "";
        let inQuotes = false;
        for (const ch of lines[i]) {
          if (ch === '"') {
            inQuotes = !inQuotes;
            continue;
          }
          if (ch === "," && !inQuotes) {
            values.push(current.trim());
            current = "";
            continue;
          }
          current += ch;
        }
        values.push(current.trim());

        if (values.length < headers.length) {
          results.errors.push(`Row ${i + 1}: insufficient columns`);
          continue;
        }

        const row: Record<string, string> = {};
        headers.forEach((h, idx) => (row[h] = values[idx] || ""));

        if (!row.name || !row.sku || !row.unit) {
          results.errors.push(`Row ${i + 1}: missing name, sku, or unit`);
          continue;
        }

        // Check duplicate
        const existing = await Product.findOne({
          tenantId,
          sku: row.sku,
          isActive: true,
        });
        if (existing) {
          results.skipped++;
          results.errors.push(`Row ${i + 1}: SKU "${row.sku}" already exists`);
          continue;
        }

        // Resolve category
        let categoryId;
        if (row.category) {
          categoryId = categoryMap.get(row.category.toLowerCase());
          if (!categoryId) {
            const cat = await Category.create({ tenantId, name: row.category });
            categoryMap.set(row.category.toLowerCase(), cat._id);
            categoryId = cat._id;
          }
        }

        await Product.create({
          tenantId,
          name: row.name,
          genericName: row.genericname || row["generic name"] || "",
          sku: row.sku,
          barcode: row.barcode || "",
          categoryId,
          manufacturer: row.manufacturer || "",
          dosageForm: row.dosageform || row["dosage form"] || "",
          strength: row.strength || "",
          unit: row.unit,
          costPrice: parseFloat(row.costprice) || 0,
          sellingPrice: parseFloat(row.sellingprice) || 0,
          reorderLevel:
            parseInt(row.reorderlevel || row["reorder level"] || "10") || 10,
          description: row.description || "",
        });
        results.created++;
      }

      res.json({
        success: true,
        message: `Import complete: ${results.created} created, ${results.skipped} skipped`,
        data: results,
      });
    } catch (err) {
      next(err);
    }
  },
);
