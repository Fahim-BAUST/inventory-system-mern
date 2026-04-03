import { Router, Request, Response, NextFunction } from "express";
import { Prescription } from "../models/prescription.model";
import { extractUser, requirePermission } from "../middleware/permissions";
import {
  PERMISSIONS,
  NotFoundError,
  BadRequestError,
} from "@pharmacy-saas/shared";

export const prescriptionRoutes = Router();
prescriptionRoutes.use(extractUser);

// GET /api/sales/prescriptions
prescriptionRoutes.get(
  "/",
  requirePermission(PERMISSIONS.SALES_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = (req as any).user;
      const { search, status } = req.query;
      const filter: any = { tenantId };
      if (status) filter.status = status;
      if (search) {
        filter.$or = [
          { prescriptionNumber: { $regex: search, $options: "i" } },
          { patientName: { $regex: search, $options: "i" } },
          { doctorName: { $regex: search, $options: "i" } },
        ];
      }
      const prescriptions = await Prescription.find(filter)
        .sort({ createdAt: -1 })
        .limit(200);
      res.json({ success: true, data: prescriptions });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/sales/prescriptions/:id
prescriptionRoutes.get(
  "/:id",
  requirePermission(PERMISSIONS.SALES_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = (req as any).user;
      const rx = await Prescription.findOne({ _id: req.params.id, tenantId });
      if (!rx) throw new NotFoundError("Prescription not found");
      res.json({ success: true, data: rx });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/sales/prescriptions
prescriptionRoutes.post(
  "/",
  requirePermission(PERMISSIONS.SALES_CREATE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = (req as any).user;
      const {
        patientName,
        doctorName,
        doctorPhone,
        diagnosis,
        medications,
        notes,
        customerId,
      } = req.body;
      if (!patientName) throw new BadRequestError("Patient name is required");

      const count = await Prescription.countDocuments({ tenantId });
      const prescriptionNumber = `RX-${String(count + 1).padStart(5, "0")}`;

      const rx = await Prescription.create({
        tenantId,
        prescriptionNumber,
        patientName,
        doctorName,
        doctorPhone,
        diagnosis,
        medications,
        notes,
        customerId: customerId || undefined,
      });

      res.status(201).json({ success: true, data: rx });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/sales/prescriptions/:id
prescriptionRoutes.patch(
  "/:id",
  requirePermission(PERMISSIONS.SALES_CREATE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = (req as any).user;
      const {
        patientName,
        doctorName,
        doctorPhone,
        diagnosis,
        medications,
        notes,
        status,
      } = req.body;
      const update: any = {};
      if (patientName !== undefined) update.patientName = patientName;
      if (doctorName !== undefined) update.doctorName = doctorName;
      if (doctorPhone !== undefined) update.doctorPhone = doctorPhone;
      if (diagnosis !== undefined) update.diagnosis = diagnosis;
      if (medications !== undefined) update.medications = medications;
      if (notes !== undefined) update.notes = notes;
      if (status !== undefined) update.status = status;
      const rx = await Prescription.findOneAndUpdate(
        { _id: req.params.id, tenantId },
        { $set: update },
        { new: true },
      );
      if (!rx) throw new NotFoundError("Prescription not found");
      res.json({ success: true, data: rx });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/sales/prescriptions/:id/link-sale — link a sale to a prescription
prescriptionRoutes.post(
  "/:id/link-sale",
  requirePermission(PERMISSIONS.SALES_CREATE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = (req as any).user;
      const { saleId } = req.body;
      const rx = await Prescription.findOneAndUpdate(
        { _id: req.params.id, tenantId },
        { $addToSet: { saleIds: saleId }, $set: { status: "dispensed" } },
        { new: true },
      );
      if (!rx) throw new NotFoundError("Prescription not found");
      res.json({ success: true, data: rx });
    } catch (err) {
      next(err);
    }
  },
);
