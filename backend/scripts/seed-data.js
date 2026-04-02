/**
 * Seed realistic pharmacy data for a tenant
 * Usage: node scripts/seed-data.js <tenantId>
 */
const mongoose = require("mongoose");

const CLI_TENANT_ID = process.argv[2];
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/pharmacy-saas";

async function seed() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  let tenantId = CLI_TENANT_ID;
  if (!tenantId) {
    const existingTenant = await db
      .collection("tenants")
      .findOne({}, { projection: { _id: 1 } });
    if (!existingTenant) {
      throw new Error(
        "No tenant found. Provide tenantId as argument: node scripts/seed-data.js <tenantId>",
      );
    }
    tenantId = existingTenant._id.toString();
  }

  const tid = new mongoose.Types.ObjectId(tenantId);

  const existingProducts = await db
    .collection("products")
    .countDocuments({ tenantId: tid });
  if (existingProducts > 0) {
    console.log(
      `⚠️ Tenant ${tenantId} already has ${existingProducts} products. Skipping seed to avoid duplicates.`,
    );
    await mongoose.disconnect();
    return;
  }

  console.log(`🌱 Seeding data for tenant: ${tenantId}\n`);

  // ── Categories ──
  const categories = [
    {
      name: "Pain Relief",
      description: "Analgesics and anti-inflammatory medicines",
      tenantId: tid,
      isActive: true,
    },
    {
      name: "Antibiotics",
      description: "Anti-bacterial medicines",
      tenantId: tid,
      isActive: true,
    },
    {
      name: "Gastric & Digestive",
      description: "Antacids, PPIs, and digestive medicines",
      tenantId: tid,
      isActive: true,
    },
    {
      name: "Diabetes",
      description: "Insulin and oral hypoglycemics",
      tenantId: tid,
      isActive: true,
    },
    {
      name: "Cardiac",
      description: "Heart and blood pressure medicines",
      tenantId: tid,
      isActive: true,
    },
    {
      name: "Vitamins & Supplements",
      description: "Multivitamins, minerals, supplements",
      tenantId: tid,
      isActive: true,
    },
    {
      name: "Cough & Cold",
      description: "Antihistamines, decongestants, cough syrups",
      tenantId: tid,
      isActive: true,
    },
    {
      name: "Skin Care",
      description: "Dermatological creams and ointments",
      tenantId: tid,
      isActive: true,
    },
    {
      name: "Eye & Ear",
      description: "Ophthalmic and otic preparations",
      tenantId: tid,
      isActive: true,
    },
    {
      name: "Baby & Mother",
      description: "Pediatric medicines and maternal supplements",
      tenantId: tid,
      isActive: true,
    },
  ];
  const catResult = await db.collection("categories").insertMany(categories);
  const catIds = Object.values(catResult.insertedIds);
  console.log(`✅ ${categories.length} categories created`);

  // ── Suppliers ──
  const suppliers = [
    {
      name: "Md. Rahul Islam",
      company: "Square Pharmaceuticals Ltd",
      email: "rahul@square.com",
      phone: "01711234567",
      address: "Pabna, Bangladesh",
      tenantId: tid,
      isActive: true,
    },
    {
      name: "Fatima Begum",
      company: "Beximco Pharmaceuticals",
      email: "fatima@beximco.com",
      phone: "01822345678",
      address: "Tongi, Gazipur",
      tenantId: tid,
      isActive: true,
    },
    {
      name: "Kamal Hossain",
      company: "Incepta Pharmaceuticals",
      email: "kamal@incepta.com",
      phone: "01933456789",
      address: "Savar, Dhaka",
      tenantId: tid,
      isActive: true,
    },
    {
      name: "Nasreen Akhter",
      company: "Renata Limited",
      email: "nasreen@renata.com",
      phone: "01644567890",
      address: "Mirpur, Dhaka",
      tenantId: tid,
      isActive: true,
    },
    {
      name: "Abul Kalam",
      company: "ACI Limited",
      email: "kalam@aci.com",
      phone: "01555678901",
      address: "Narayanganj",
      tenantId: tid,
      isActive: true,
    },
  ];
  const supResult = await db.collection("suppliers").insertMany(suppliers);
  const supIds = Object.values(supResult.insertedIds);
  console.log(`✅ ${suppliers.length} suppliers created`);

  // ── Products (30 realistic medicines) ──
  const products = [
    // Pain Relief (catIds[0])
    {
      name: "Napa 500mg",
      genericName: "Paracetamol",
      sku: "NAPA-500",
      barcode: "8801001100010",
      category: catIds[0],
      unit: "tablet",
      costPrice: 1.2,
      sellingPrice: 2,
      taxRate: 0,
      reorderLevel: 50,
      totalStock: 500,
      requiresPrescription: false,
      dosageForm: "tablet",
      strength: "500mg",
      manufacturer: "Beximco",
      isActive: true,
      tenantId: tid,
    },
    {
      name: "Napa Extra",
      genericName: "Paracetamol + Caffeine",
      sku: "NAPA-EXT",
      barcode: "8801001100027",
      category: catIds[0],
      unit: "tablet",
      costPrice: 2,
      sellingPrice: 3.5,
      taxRate: 0,
      reorderLevel: 30,
      totalStock: 300,
      requiresPrescription: false,
      dosageForm: "tablet",
      strength: "500mg+65mg",
      manufacturer: "Beximco",
      isActive: true,
      tenantId: tid,
    },
    {
      name: "Ace 500mg",
      genericName: "Paracetamol",
      sku: "ACE-500",
      barcode: "8801001100034",
      category: catIds[0],
      unit: "tablet",
      costPrice: 1,
      sellingPrice: 1.8,
      taxRate: 0,
      reorderLevel: 50,
      totalStock: 400,
      requiresPrescription: false,
      dosageForm: "tablet",
      strength: "500mg",
      manufacturer: "Square",
      isActive: true,
      tenantId: tid,
    },
    {
      name: "Toradol 10mg",
      genericName: "Ketorolac",
      sku: "TORA-10",
      barcode: "8801001100041",
      category: catIds[0],
      unit: "tablet",
      costPrice: 5,
      sellingPrice: 8,
      taxRate: 0,
      reorderLevel: 20,
      totalStock: 150,
      requiresPrescription: true,
      dosageForm: "tablet",
      strength: "10mg",
      manufacturer: "Incepta",
      isActive: true,
      tenantId: tid,
    },

    // Antibiotics (catIds[1])
    {
      name: "Amoxil 500mg",
      genericName: "Amoxicillin",
      sku: "AMOX-500",
      barcode: "8801001200017",
      category: catIds[1],
      unit: "capsule",
      costPrice: 4,
      sellingPrice: 7,
      taxRate: 0,
      reorderLevel: 30,
      totalStock: 250,
      requiresPrescription: true,
      dosageForm: "capsule",
      strength: "500mg",
      manufacturer: "Square",
      isActive: true,
      tenantId: tid,
    },
    {
      name: "Azith 500mg",
      genericName: "Azithromycin",
      sku: "AZIT-500",
      barcode: "8801001200024",
      category: catIds[1],
      unit: "tablet",
      costPrice: 12,
      sellingPrice: 20,
      taxRate: 0,
      reorderLevel: 20,
      totalStock: 180,
      requiresPrescription: true,
      dosageForm: "tablet",
      strength: "500mg",
      manufacturer: "Incepta",
      isActive: true,
      tenantId: tid,
    },
    {
      name: "Cef-3 200mg",
      genericName: "Cefixime",
      sku: "CEF3-200",
      barcode: "8801001200031",
      category: catIds[1],
      unit: "tablet",
      costPrice: 15,
      sellingPrice: 25,
      taxRate: 0,
      reorderLevel: 15,
      totalStock: 120,
      requiresPrescription: true,
      dosageForm: "tablet",
      strength: "200mg",
      manufacturer: "Renata",
      isActive: true,
      tenantId: tid,
    },
    {
      name: "Cipro 500mg",
      genericName: "Ciprofloxacin",
      sku: "CIPR-500",
      barcode: "8801001200048",
      category: catIds[1],
      unit: "tablet",
      costPrice: 3,
      sellingPrice: 5.5,
      taxRate: 0,
      reorderLevel: 25,
      totalStock: 200,
      requiresPrescription: true,
      dosageForm: "tablet",
      strength: "500mg",
      manufacturer: "ACI",
      isActive: true,
      tenantId: tid,
    },

    // Gastric (catIds[2])
    {
      name: "Seclo 20mg",
      genericName: "Omeprazole",
      sku: "SECL-20",
      barcode: "8801001300014",
      category: catIds[2],
      unit: "capsule",
      costPrice: 3,
      sellingPrice: 5,
      taxRate: 0,
      reorderLevel: 40,
      totalStock: 350,
      requiresPrescription: false,
      dosageForm: "capsule",
      strength: "20mg",
      manufacturer: "Square",
      isActive: true,
      tenantId: tid,
    },
    {
      name: "Pantonix 40mg",
      genericName: "Pantoprazole",
      sku: "PANT-40",
      barcode: "8801001300021",
      category: catIds[2],
      unit: "tablet",
      costPrice: 5,
      sellingPrice: 8,
      taxRate: 0,
      reorderLevel: 30,
      totalStock: 280,
      requiresPrescription: false,
      dosageForm: "tablet",
      strength: "40mg",
      manufacturer: "Incepta",
      isActive: true,
      tenantId: tid,
    },
    {
      name: "Antacid Plus",
      genericName: "Aluminium Hydroxide + Magnesium",
      sku: "ANTC-PLS",
      barcode: "8801001300038",
      category: catIds[2],
      unit: "bottle",
      costPrice: 25,
      sellingPrice: 40,
      taxRate: 0,
      reorderLevel: 15,
      totalStock: 80,
      requiresPrescription: false,
      dosageForm: "suspension",
      strength: "200ml",
      manufacturer: "Renata",
      isActive: true,
      tenantId: tid,
    },

    // Diabetes (catIds[3])
    {
      name: "Metformin 500mg",
      genericName: "Metformin HCl",
      sku: "METF-500",
      barcode: "8801001400011",
      category: catIds[3],
      unit: "tablet",
      costPrice: 1.5,
      sellingPrice: 3,
      taxRate: 0,
      reorderLevel: 40,
      totalStock: 500,
      requiresPrescription: true,
      dosageForm: "tablet",
      strength: "500mg",
      manufacturer: "Square",
      isActive: true,
      tenantId: tid,
    },
    {
      name: "Glimepiride 2mg",
      genericName: "Glimepiride",
      sku: "GLIM-2",
      barcode: "8801001400028",
      category: catIds[3],
      unit: "tablet",
      costPrice: 3,
      sellingPrice: 5,
      taxRate: 0,
      reorderLevel: 25,
      totalStock: 200,
      requiresPrescription: true,
      dosageForm: "tablet",
      strength: "2mg",
      manufacturer: "Beximco",
      isActive: true,
      tenantId: tid,
    },
    {
      name: "Insulin Mixtard 30/70",
      genericName: "Insulin Human",
      sku: "INSU-MIX",
      barcode: "8801001400035",
      category: catIds[3],
      unit: "vial",
      costPrice: 280,
      sellingPrice: 380,
      taxRate: 0,
      reorderLevel: 5,
      totalStock: 15,
      requiresPrescription: true,
      dosageForm: "injection",
      strength: "100IU/ml",
      manufacturer: "Novo Nordisk",
      isActive: true,
      tenantId: tid,
    },

    // Cardiac (catIds[4])
    {
      name: "Amlodipine 5mg",
      genericName: "Amlodipine",
      sku: "AMLO-5",
      barcode: "8801001500018",
      category: catIds[4],
      unit: "tablet",
      costPrice: 2,
      sellingPrice: 3.5,
      taxRate: 0,
      reorderLevel: 30,
      totalStock: 300,
      requiresPrescription: true,
      dosageForm: "tablet",
      strength: "5mg",
      manufacturer: "Square",
      isActive: true,
      tenantId: tid,
    },
    {
      name: "Losartan 50mg",
      genericName: "Losartan Potassium",
      sku: "LOSA-50",
      barcode: "8801001500025",
      category: catIds[4],
      unit: "tablet",
      costPrice: 4,
      sellingPrice: 7,
      taxRate: 0,
      reorderLevel: 25,
      totalStock: 8,
      requiresPrescription: true,
      dosageForm: "tablet",
      strength: "50mg",
      manufacturer: "Incepta",
      isActive: true,
      tenantId: tid,
    },
    {
      name: "Atorvastatin 10mg",
      genericName: "Atorvastatin",
      sku: "ATOR-10",
      barcode: "8801001500032",
      category: catIds[4],
      unit: "tablet",
      costPrice: 3,
      sellingPrice: 5,
      taxRate: 0,
      reorderLevel: 20,
      totalStock: 250,
      requiresPrescription: true,
      dosageForm: "tablet",
      strength: "10mg",
      manufacturer: "Renata",
      isActive: true,
      tenantId: tid,
    },
    {
      name: "Aspirin 75mg",
      genericName: "Acetylsalicylic Acid",
      sku: "ASPR-75",
      barcode: "8801001500049",
      category: catIds[4],
      unit: "tablet",
      costPrice: 0.8,
      sellingPrice: 1.5,
      taxRate: 0,
      reorderLevel: 50,
      totalStock: 600,
      requiresPrescription: false,
      dosageForm: "tablet",
      strength: "75mg",
      manufacturer: "ACI",
      isActive: true,
      tenantId: tid,
    },

    // Vitamins (catIds[5])
    {
      name: "Cevit 250mg",
      genericName: "Vitamin C",
      sku: "CEVT-250",
      barcode: "8801001600015",
      category: catIds[5],
      unit: "tablet",
      costPrice: 1,
      sellingPrice: 2,
      taxRate: 0,
      reorderLevel: 40,
      totalStock: 400,
      requiresPrescription: false,
      dosageForm: "chewable",
      strength: "250mg",
      manufacturer: "Square",
      isActive: true,
      tenantId: tid,
    },
    {
      name: "Calbo-D",
      genericName: "Calcium + Vitamin D3",
      sku: "CALB-D",
      barcode: "8801001600022",
      category: catIds[5],
      unit: "tablet",
      costPrice: 5,
      sellingPrice: 8,
      taxRate: 0,
      reorderLevel: 20,
      totalStock: 200,
      requiresPrescription: false,
      dosageForm: "tablet",
      strength: "500mg+200IU",
      manufacturer: "Renata",
      isActive: true,
      tenantId: tid,
    },
    {
      name: "B-Complex Forte",
      genericName: "Vitamin B Complex",
      sku: "BCOM-F",
      barcode: "8801001600039",
      category: catIds[5],
      unit: "tablet",
      costPrice: 2,
      sellingPrice: 3.5,
      taxRate: 0,
      reorderLevel: 30,
      totalStock: 350,
      requiresPrescription: false,
      dosageForm: "tablet",
      strength: "Multi",
      manufacturer: "Beximco",
      isActive: true,
      tenantId: tid,
    },

    // Cough & Cold (catIds[6])
    {
      name: "Brodil Syrup",
      genericName: "Salbutamol",
      sku: "BROD-SYR",
      barcode: "8801001700012",
      category: catIds[6],
      unit: "bottle",
      costPrice: 30,
      sellingPrice: 50,
      taxRate: 0,
      reorderLevel: 10,
      totalStock: 60,
      requiresPrescription: false,
      dosageForm: "syrup",
      strength: "2mg/5ml",
      manufacturer: "Square",
      isActive: true,
      tenantId: tid,
    },
    {
      name: "Histacin 4mg",
      genericName: "Chlorpheniramine",
      sku: "HIST-4",
      barcode: "8801001700029",
      category: catIds[6],
      unit: "tablet",
      costPrice: 0.5,
      sellingPrice: 1,
      taxRate: 0,
      reorderLevel: 50,
      totalStock: 3,
      requiresPrescription: false,
      dosageForm: "tablet",
      strength: "4mg",
      manufacturer: "ACI",
      isActive: true,
      tenantId: tid,
    },
    {
      name: "Fexo 120mg",
      genericName: "Fexofenadine",
      sku: "FEXO-120",
      barcode: "8801001700036",
      category: catIds[6],
      unit: "tablet",
      costPrice: 6,
      sellingPrice: 10,
      taxRate: 0,
      reorderLevel: 20,
      totalStock: 180,
      requiresPrescription: false,
      dosageForm: "tablet",
      strength: "120mg",
      manufacturer: "Incepta",
      isActive: true,
      tenantId: tid,
    },

    // Skin Care (catIds[7])
    {
      name: "Dermovate Cream",
      genericName: "Clobetasol Propionate",
      sku: "DERM-CRM",
      barcode: "8801001800019",
      category: catIds[7],
      unit: "tube",
      costPrice: 40,
      sellingPrice: 65,
      taxRate: 0,
      reorderLevel: 8,
      totalStock: 45,
      requiresPrescription: true,
      dosageForm: "cream",
      strength: "0.05%",
      manufacturer: "GSK",
      isActive: true,
      tenantId: tid,
    },
    {
      name: "Ketoconazole Cream",
      genericName: "Ketoconazole",
      sku: "KETO-CRM",
      barcode: "8801001800026",
      category: catIds[7],
      unit: "tube",
      costPrice: 25,
      sellingPrice: 40,
      taxRate: 0,
      reorderLevel: 10,
      totalStock: 55,
      requiresPrescription: false,
      dosageForm: "cream",
      strength: "2%",
      manufacturer: "Renata",
      isActive: true,
      tenantId: tid,
    },

    // Eye & Ear (catIds[8])
    {
      name: "Ocuflox Eye Drop",
      genericName: "Ofloxacin",
      sku: "OCUF-ED",
      barcode: "8801001900016",
      category: catIds[8],
      unit: "bottle",
      costPrice: 35,
      sellingPrice: 55,
      taxRate: 0,
      reorderLevel: 10,
      totalStock: 40,
      requiresPrescription: true,
      dosageForm: "eye drop",
      strength: "0.3%",
      manufacturer: "Incepta",
      isActive: true,
      tenantId: tid,
    },

    // Baby & Mother (catIds[9])
    {
      name: "Paediasure",
      genericName: "Nutritional Supplement",
      sku: "PAED-SUP",
      barcode: "8801002000012",
      category: catIds[9],
      unit: "can",
      costPrice: 450,
      sellingPrice: 580,
      taxRate: 0,
      reorderLevel: 5,
      totalStock: 20,
      requiresPrescription: false,
      dosageForm: "powder",
      strength: "400g",
      manufacturer: "Abbott",
      isActive: true,
      tenantId: tid,
    },
    {
      name: "Folic Acid 5mg",
      genericName: "Folic Acid",
      sku: "FOLC-5",
      barcode: "8801002000029",
      category: catIds[9],
      unit: "tablet",
      costPrice: 0.5,
      sellingPrice: 1,
      taxRate: 0,
      reorderLevel: 40,
      totalStock: 500,
      requiresPrescription: false,
      dosageForm: "tablet",
      strength: "5mg",
      manufacturer: "Square",
      isActive: true,
      tenantId: tid,
    },
  ];

  const prodResult = await db.collection("products").insertMany(
    products.map((p) => ({
      ...p,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  );
  const prodIds = Object.values(prodResult.insertedIds);
  console.log(`✅ ${products.length} products created`);

  // ── Batches (with varying expiry dates) ──
  const now = new Date();
  const batches = [];
  prodIds.forEach((pid, i) => {
    // Batch 1: normal expiry (6-18 months from now)
    const months1 = 6 + Math.floor(Math.random() * 12);
    batches.push({
      tenantId: tid,
      productId: pid,
      batchNumber: `BN-2026-${String(i + 1).padStart(3, "0")}A`,
      quantity: Math.floor(products[i].totalStock * 0.6),
      purchasePrice: products[i].costPrice,
      manufacturingDate: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      expiryDate: new Date(now.getTime() + months1 * 30 * 24 * 60 * 60 * 1000),
      supplier: supIds[i % supIds.length],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    // Batch 2: second batch
    const months2 = 3 + Math.floor(Math.random() * 6);
    batches.push({
      tenantId: tid,
      productId: pid,
      batchNumber: `BN-2026-${String(i + 1).padStart(3, "0")}B`,
      quantity: Math.floor(products[i].totalStock * 0.4),
      purchasePrice: products[i].costPrice,
      manufacturingDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      expiryDate: new Date(now.getTime() + months2 * 30 * 24 * 60 * 60 * 1000),
      supplier: supIds[(i + 1) % supIds.length],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  // Add some EXPIRING SOON batches (within 30 days) and EXPIRED batches
  batches.push({
    tenantId: tid,
    productId: prodIds[0],
    batchNumber: "BN-EXP-001",
    quantity: 20,
    purchasePrice: 1.2,
    manufacturingDate: new Date("2025-06-01"),
    expiryDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
    supplier: supIds[0],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  batches.push({
    tenantId: tid,
    productId: prodIds[4],
    batchNumber: "BN-EXP-002",
    quantity: 10,
    purchasePrice: 4,
    manufacturingDate: new Date("2025-03-01"),
    expiryDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    supplier: supIds[1],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  batches.push({
    tenantId: tid,
    productId: prodIds[8],
    batchNumber: "BN-EXP-003",
    quantity: 5,
    purchasePrice: 3,
    manufacturingDate: new Date("2025-01-01"),
    expiryDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // ALREADY EXPIRED
    supplier: supIds[2],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await db.collection("batches").insertMany(batches);
  console.log(
    `✅ ${batches.length} batches created (incl. 2 expiring soon + 1 expired)`,
  );

  // ── Sales (last 30 days of realistic sales) ──
  const userId = (await db.collection("users").findOne({ tenantId: tid }))._id;
  const sales = [];
  let invoiceSeq = 0;

  for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
    const salesPerDay = 3 + Math.floor(Math.random() * 8); // 3-10 sales per day
    for (let s = 0; s < salesPerDay; s++) {
      invoiceSeq++;
      const numItems = 1 + Math.floor(Math.random() * 4); // 1-4 items per sale
      const items = [];
      const usedProducts = new Set();

      for (let it = 0; it < numItems; it++) {
        let pIdx;
        do {
          pIdx = Math.floor(Math.random() * products.length);
        } while (usedProducts.has(pIdx));
        usedProducts.add(pIdx);
        const qty = 1 + Math.floor(Math.random() * 5);
        items.push({
          productId: prodIds[pIdx],
          productName: products[pIdx].name,
          quantity: qty,
          unitPrice: products[pIdx].sellingPrice,
          total: qty * products[pIdx].sellingPrice,
        });
      }

      const subtotal = items.reduce((sum, it) => sum + it.total, 0);
      const discount = Math.random() < 0.2 ? Math.round(subtotal * 0.05) : 0; // 20% chance of 5% discount
      const totalAmount = subtotal - discount;
      const methods = ["cash", "cash", "cash", "card", "mobile"]; // weighted towards cash
      const saleDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      saleDate.setHours(
        9 + Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 60),
      );

      sales.push({
        tenantId: tid,
        invoiceNumber: `INV-${String(invoiceSeq).padStart(6, "0")}`,
        items,
        subtotal,
        discount,
        totalAmount,
        paymentMethod: methods[Math.floor(Math.random() * methods.length)],
        paymentStatus: "paid",
        soldBy: userId,
        isReturned: false,
        createdAt: saleDate,
        updatedAt: saleDate,
      });
    }
  }

  await db.collection("sales").insertMany(sales);
  // Update counter
  await db
    .collection("counters")
    .updateOne(
      { tenantId: tid, name: "invoice" },
      { $set: { seq: invoiceSeq } },
      { upsert: true },
    );
  console.log(`✅ ${sales.length} sales created (last 30 days)`);

  // ── Daily Summaries (for analytics) ──
  const summaries = [];
  for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
    const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    date.setHours(0, 0, 0, 0);
    const dateStr = date.toISOString().split("T")[0];

    const daySales = sales.filter((s) => {
      const sd = new Date(s.createdAt);
      sd.setHours(0, 0, 0, 0);
      return sd.getTime() === date.getTime();
    });

    summaries.push({
      tenantId: tid,
      date: dateStr,
      totalSales: daySales.length,
      totalRevenue: daySales.reduce((sum, s) => sum + s.totalAmount, 0),
      totalReturns: 0,
      itemsSold: daySales.reduce(
        (sum, s) => sum + s.items.reduce((a, i) => a + i.quantity, 0),
        0,
      ),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  await db.collection("dailysummaries").insertMany(summaries);
  console.log(`✅ ${summaries.length} daily summaries created (analytics)`);

  // ── Notifications ──
  const notifications = [
    {
      tenantId: tid,
      type: "low_stock",
      title: "Low Stock Alert",
      message: "Losartan 50mg is running low (8 remaining).",
      isRead: false,
      metadata: { productName: "Losartan 50mg", currentStock: 8 },
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      updatedAt: new Date(),
    },
    {
      tenantId: tid,
      type: "low_stock",
      title: "Low Stock Alert",
      message: "Histacin 4mg is critically low (3 remaining).",
      isRead: false,
      metadata: { productName: "Histacin 4mg", currentStock: 3 },
      createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      updatedAt: new Date(),
    },
    {
      tenantId: tid,
      type: "expiry_warning",
      title: "Expiry Warning",
      message: "Batch BN-EXP-001 (Napa 500mg) is expiring in 15 days.",
      isRead: false,
      metadata: {},
      createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      updatedAt: new Date(),
    },
    {
      tenantId: tid,
      type: "expiry_warning",
      title: "Expiry Warning",
      message: "Batch BN-EXP-002 (Amoxil 500mg) is expiring in 7 days.",
      isRead: true,
      metadata: {},
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    },
    {
      tenantId: tid,
      type: "system",
      title: "Welcome!",
      message:
        "Your pharmacy is set up. Start adding products and making sales!",
      isRead: true,
      metadata: {},
      createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    },
  ];

  await db.collection("notifications").insertMany(notifications);
  console.log(`✅ ${notifications.length} notifications created`);

  // ── Summary ──
  const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  console.log("\n══════════════════════════════════════");
  console.log("  🌱 Seed Complete!");
  console.log(`  Categories:     ${categories.length}`);
  console.log(`  Suppliers:      ${suppliers.length}`);
  console.log(`  Products:       ${products.length}`);
  console.log(`  Batches:        ${batches.length}`);
  console.log(`  Sales:          ${sales.length}`);
  console.log(`  Revenue:        ৳${totalRevenue.toFixed(2)}`);
  console.log(`  Summaries:      ${summaries.length} days`);
  console.log(`  Notifications:  ${notifications.length}`);
  console.log(`  Low stock items: 2 (Losartan, Histacin)`);
  console.log(`  Expiring soon:  2 batches`);
  console.log(`  Expired:        1 batch`);
  console.log("══════════════════════════════════════\n");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
