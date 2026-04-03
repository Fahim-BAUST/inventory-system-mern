import { mongoose } from "@pharmacy-saas/db";
const { Schema, model } = mongoose;

const auditLogSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, required: true },
    userName: { type: String },
    action: {
      type: String,
      required: true,
      enum: [
        "create",
        "update",
        "delete",
        "login",
        "logout",
        "return",
        "status_change",
        "import",
        "export",
        "other",
      ],
    },
    entity: { type: String, required: true }, // e.g. "product", "sale", "user"
    entityId: { type: String },
    description: { type: String },
    changes: { type: Schema.Types.Mixed }, // { field: { from, to } }
    ipAddress: { type: String },
  },
  { timestamps: true },
);

auditLogSchema.index({ tenantId: 1, createdAt: -1 });
auditLogSchema.index({ tenantId: 1, entity: 1 });

export const AuditLog = model("AuditLog", auditLogSchema);
