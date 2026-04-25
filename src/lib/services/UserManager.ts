import { Types } from "mongoose";
import {
    Agent,
    AgentModel,
    Authorization,
    AuthorizationModel,
    Student,
    StudentModel,
} from "../models/User";
import { RechargeModel, type RechargeDoc } from "../models/Recharge";
import { STUDENT_CYCLES } from "../constants/studentCycles";

type Id = string | Types.ObjectId;

type StudentCreateInput = Omit<Student, "_id">;
type StudentUpdateInput = Partial<StudentCreateInput>;

type AgentCreateInput = Omit<Agent, "_id">;
type AgentUpdateInput = Partial<AgentCreateInput>;

type AuthorizationCreateInput = Omit<Authorization, "_id" | "createdAt" | "updatedAt">;
type AuthorizationUpdateInput = Partial<AuthorizationCreateInput>;
export type UserType = "Agent" | "Student";
export type AgentWithAuthorizations = Agent & { authorizations: Authorization[] };
export type UserByEmailResult = Student | AgentWithAuthorizations;
export type AgentRole = Agent["role"];
export type AgentListItem = {
    id: string;
    name: string;
    email: string;
    matricule: string;
    diplome: string;
    status: Agent["status"];
    photo: string;
    role: AgentRole;
    authorizationsCount: number;
};

export type StudentListItem = {
    id: string;
    name: string;
    email: string;
    matricule: string;
    diplome: string;
    status: Student["status"];
    photo: string;
    cycle: string;
    depositsCount: number;
};

export type RechargeListItem = {
    id: string;
    orderNumber?: string;
    amount: number;
    currency: "USD" | "CDF";
    phoneNumber: string;
    status: "pending" | "paid" | "failed";
    createdAt: string;
};

/** Liste admin : recharges jointes à l’étudiant */
export type AdminRechargeListItem = {
    id: string;
    studentId: string;
    studentName: string;
    studentEmail: string;
    studentMatricule: string;
    orderNumber?: string;
    amount: number;
    currency: "USD" | "CDF";
    phoneNumber: string;
    status: "pending" | "paid" | "failed";
    createdAt: string;
};

export { STUDENT_CYCLES } from "../constants/studentCycles";

/**
 * Service singleton for CRUD operations on students, agents and authorizations.
 */
class UserManager {
    private static instance: UserManager;

    private constructor() {}

    public static getInstance(): UserManager {
        if (!UserManager.instance) {
            UserManager.instance = new UserManager();
        }
        return UserManager.instance;
    }

    /**
     * Fetch a user by email based on the requested type.
     * For agents, authorizations are also returned.
     */
    public async getUserByEmail(type: UserType, email: string): Promise<UserByEmailResult | null> {
        if (type === "Student") {
            return StudentModel.findOne({ email });
        }

        const agent = await AgentModel.findOne({ email });
        if (!agent) {
            return null;
        }

        const authorizations = await AuthorizationModel.find({ agentId: agent._id }).sort({
            createdAt: -1,
        });

        return {
            ...agent.toObject(),
            authorizations,
        };
    }

    // Students CRUD
    public async createStudent(payload: StudentCreateInput): Promise<Student> {
        return StudentModel.create(payload);
    }

    public async getStudentById(id: Id): Promise<Student | null> {
        return StudentModel.findById(id);
    }

    public async getAllStudents(): Promise<Student[]> {
        return StudentModel.find().sort({ createdAt: -1 });
    }

    public async getStudentsPaginated(offset = 0, limit = 50): Promise<Student[]> {
        return StudentModel.find()
            .sort({ createdAt: -1 })
            .skip(offset)
            .limit(limit);
    }

    public async getStudentsList(filters: {
        cycle?: string;
        search?: string;
        status?: "active" | "inactive";
        offset?: number;
        limit?: number;
    }): Promise<StudentListItem[]> {
        const { cycle, search, status, offset = 0, limit = 50 } = filters;
        const match: Record<string, unknown> = {};

        if (cycle && STUDENT_CYCLES.includes(cycle as (typeof STUDENT_CYCLES)[number])) {
            match.cycle = cycle;
        }

        if (status === "active" || status === "inactive") {
            match.status = status;
        }

        if (search && search.trim().length > 0) {
            const value = search.trim();
            match.$or = [
                { name: { $regex: value, $options: "i" } },
                { email: { $regex: value, $options: "i" } },
                { matricule: { $regex: value, $options: "i" } },
            ];
        }

        const data = await StudentModel.aggregate([
            { $match: match },
            { $sort: { createdAt: -1 } },
            { $skip: offset },
            { $limit: limit },
            {
                $lookup: {
                    from: "recharges",
                    localField: "_id",
                    foreignField: "studentId",
                    as: "_rechDoc",
                },
            },
            {
                $addFields: {
                    depositsCount: {
                        $cond: {
                            if: { $gt: [{ $size: { $ifNull: ["$_rechDoc", []] } }, 0] },
                            then: { $size: "$_rechDoc" },
                            else: { $size: { $ifNull: ["$deposits", []] } },
                        },
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    id: { $toString: "$_id" },
                    name: 1,
                    email: 1,
                    matricule: 1,
                    diplome: 1,
                    status: 1,
                    photo: 1,
                    cycle: 1,
                    depositsCount: 1,
                },
            },
        ]);

        return data as StudentListItem[];
    }

    public async countStudents(filters: {
        cycle?: string;
        search?: string;
        status?: "active" | "inactive";
    }): Promise<number> {
        const { cycle, search, status } = filters;
        const match: Record<string, unknown> = {};
        if (cycle && STUDENT_CYCLES.includes(cycle as (typeof STUDENT_CYCLES)[number])) {
            match.cycle = cycle;
        }
        if (status === "active" || status === "inactive") {
            match.status = status;
        }
        if (search && search.trim().length > 0) {
            const value = search.trim();
            match.$or = [
                { name: { $regex: value, $options: "i" } },
                { email: { $regex: value, $options: "i" } },
                { matricule: { $regex: value, $options: "i" } },
            ];
        }
        return StudentModel.countDocuments(match);
    }

    public async updateStudent(id: Id, payload: StudentUpdateInput): Promise<Student | null> {
        return StudentModel.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
    }

    public async deleteStudent(id: Id): Promise<Student | null> {
        const sid = new Types.ObjectId(String(id));
        await RechargeModel.deleteMany({ studentId: sid });
        return StudentModel.findByIdAndDelete(id);
    }

    public async addStudentDeposit(
        id: Id,
        deposit: { amount: number; currency: "USD" | "CDF"; phoneNumber: string }
    ): Promise<RechargeDoc | null> {
        const student = await StudentModel.findById(id);
        if (!student) {
            return null;
        }
        const r = await RechargeModel.create({
            studentId: student._id,
            amount: deposit.amount,
            currency: deposit.currency,
            phoneNumber: deposit.phoneNumber,
            status: "pending",
        });
        const rid = String(r._id);
        await StudentModel.findByIdAndUpdate(student._id, {
            $push: {
                deposits: {
                    rechargeId: rid,
                    amount: r.amount,
                    currency: r.currency,
                    phoneNumber: r.phoneNumber,
                    status: r.status,
                },
            },
        });
        return r;
    }

    public async ensureMigratedRechargesForStudent(studentId: Id): Promise<void> {
        const sid = new Types.ObjectId(String(studentId));
        const n = await RechargeModel.countDocuments({ studentId: sid });
        if (n > 0) {
            return;
        }
        const s = await StudentModel.findById(sid).lean();
        if (!s?.deposits?.length) {
            return;
        }
        const created = await RechargeModel.insertMany(
            s.deposits.map((d) => ({
                studentId: sid,
                amount: d.amount,
                currency: d.currency,
                phoneNumber: d.phoneNumber,
                orderNumber: d.orderNumber,
                status: (d.status as "pending" | "paid" | "failed") ?? "pending",
            })),
            { ordered: true }
        );
        if (created.length) {
            await StudentModel.bulkWrite(
                created.map((doc, i) => ({
                    updateOne: {
                        filter: { _id: sid },
                        update: { $set: { [`deposits.${i}.rechargeId`]: String(doc._id) } },
                    },
                }))
            );
        }
    }

    public async getRechargesPaginated(params: {
        studentId: Id;
        offset?: number;
        limit?: number;
        status?: "all" | "pending" | "paid" | "failed";
        search?: string;
    }): Promise<{ items: RechargeListItem[]; total: number }> {
        await this.ensureMigratedRechargesForStudent(params.studentId);
        const sid = new Types.ObjectId(String(params.studentId));
        const offset = Math.max(0, params.offset ?? 0);
        const limit = Math.min(100, Math.max(1, params.limit ?? 20));
        const search = (params.search ?? "").trim();

        const andParts: Record<string, unknown>[] = [{ studentId: sid }];
        if (params.status && params.status !== "all") {
            andParts.push({ status: params.status });
        }
        if (search) {
            const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const or: Record<string, unknown>[] = [
                { orderNumber: { $regex: esc(search), $options: "i" } },
                { phoneNumber: { $regex: esc(search), $options: "i" } },
            ];
            const num = Number.parseFloat(search.replace(/,/g, "."));
            if (Number.isFinite(num)) {
                or.push({ amount: num });
            }
            andParts.push({ $or: or });
        }
        const filter: Record<string, unknown> = andParts.length === 1 ? andParts[0] : { $and: andParts };

        const [total, docs] = await Promise.all([
            RechargeModel.countDocuments(filter),
            RechargeModel.find(filter)
                .sort({ createdAt: -1 })
                .skip(offset)
                .limit(limit)
                .lean(),
        ]);

        const items: RechargeListItem[] = docs.map((d) => ({
            id: String(d._id),
            orderNumber: d.orderNumber,
            amount: d.amount,
            currency: d.currency,
            phoneNumber: d.phoneNumber,
            status: d.status,
            createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : new Date(0).toISOString(),
        }));

        return { items, total };
    }

    public async getRechargeByIdForStudent(
        rechargeId: Id,
        studentId: Id
    ): Promise<RechargeDoc | null> {
        const r = await RechargeModel.findById(rechargeId);
        if (!r) {
            return null;
        }
        if (r.studentId.toString() !== String(studentId)) {
            return null;
        }
        return r;
    }

    public async setRechargeOrderNumber(rechargeId: Id, orderNumber: string): Promise<RechargeDoc | null> {
        const doc = await RechargeModel.findByIdAndUpdate(
            rechargeId,
            { $set: { orderNumber } },
            { new: true, runValidators: true }
        );
        if (doc) {
            await this.syncStudentDepositFromRecharge(doc.studentId, doc._id, { orderNumber });
        }
        return doc;
    }

    public async setRechargeStatus(
        rechargeId: Id,
        status: "pending" | "paid" | "failed"
    ): Promise<RechargeDoc | null> {
        const doc = await RechargeModel.findByIdAndUpdate(
            rechargeId,
            { $set: { status } },
            { new: true, runValidators: true }
        );
        if (doc) {
            await this.syncStudentDepositFromRecharge(doc.studentId, doc._id, { status: doc.status });
        }
        return doc;
    }

    /** Aligne l’entrée `deposits[]` de l’étudiant sur la recharge (si `rechargeId` est présent). */
    private async syncStudentDepositFromRecharge(
        studentId: Id,
        rechargeId: Id,
        patch: { orderNumber?: string; status?: "pending" | "paid" | "failed" }
    ): Promise<void> {
        const rrid = String(rechargeId);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const $set: Record<string, any> = {};
        if (patch.orderNumber !== undefined) {
            $set["deposits.$[d].orderNumber"] = patch.orderNumber;
        }
        if (patch.status !== undefined) {
            $set["deposits.$[d].status"] = patch.status;
        }
        if (Object.keys($set).length === 0) {
            return;
        }
        await StudentModel.updateOne(
            { _id: new Types.ObjectId(String(studentId)) },
            { $set },
            { arrayFilters: [{ "d.rechargeId": rrid }] }
        );
    }

    public async getRechargeById(rechargeId: Id): Promise<RechargeDoc | null> {
        return RechargeModel.findById(rechargeId);
    }

    /**
     * Toutes les recharges (admin), avec filtre et recherche sur étudiant / commande.
     */
    public async getAllRechargesPaginated(filters: {
        offset?: number;
        limit?: number;
        status?: "all" | "pending" | "paid" | "failed";
        search?: string;
    }): Promise<{ items: AdminRechargeListItem[]; total: number }> {
        const offset = Math.max(0, filters.offset ?? 0);
        const limit = Math.min(200, Math.max(1, filters.limit ?? 20));
        const search = (filters.search ?? "").trim();
        const statusF = filters.status;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pipeline: any[] = [];
        if (statusF && statusF !== "all") {
            pipeline.push({ $match: { status: statusF } });
        }
        pipeline.push(
            {
                $lookup: {
                    from: "students",
                    let: { sid: "$studentId" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$_id", "$$sid"] } } },
                        { $project: { name: 1, email: 1, matricule: 1 } },
                    ],
                    as: "student",
                },
            },
            { $unwind: { path: "$student", preserveNullAndEmptyArrays: true } }
        );
        if (search) {
            const esc = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const rx = { $regex: esc, $options: "i" };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const or: any[] = [
                { orderNumber: rx },
                { phoneNumber: rx },
                { "student.name": rx },
                { "student.email": rx },
                { "student.matricule": rx },
            ];
            const num = Number.parseFloat(search.replace(/,/g, "."));
            if (Number.isFinite(num)) {
                or.push({ amount: num });
            }
            pipeline.push({ $match: { $or: or } });
        }

        const [countRow] = await RechargeModel.aggregate([...pipeline, { $count: "c" }]);
        const total = countRow && typeof countRow.c === "number" ? countRow.c : 0;

        const rows = await RechargeModel.aggregate([
            ...pipeline,
            { $sort: { createdAt: -1 } },
            { $skip: offset },
            { $limit: limit },
            {
                $project: {
                    _id: 1,
                    studentId: 1,
                    orderNumber: 1,
                    amount: 1,
                    currency: 1,
                    phoneNumber: 1,
                    status: 1,
                    createdAt: 1,
                    studentName: "$student.name",
                    studentEmail: "$student.email",
                    studentMatricule: "$student.matricule",
                },
            },
        ]);

        const items: AdminRechargeListItem[] = rows.map((d: Record<string, unknown>) => ({
            id: String(d._id),
            studentId: String(d.studentId),
            studentName: d.studentName != null ? String(d.studentName) : "—",
            studentEmail: d.studentEmail != null ? String(d.studentEmail) : "—",
            studentMatricule: d.studentMatricule != null ? String(d.studentMatricule) : "—",
            orderNumber: d.orderNumber != null ? String(d.orderNumber) : undefined,
            amount: d.amount as number,
            currency: d.currency as "USD" | "CDF",
            phoneNumber: String(d.phoneNumber),
            status: d.status as "pending" | "paid" | "failed",
            createdAt: d.createdAt
                ? new Date(d.createdAt as string | Date).toISOString()
                : new Date(0).toISOString(),
        }));

        return { items, total };
    }

    // Agents CRUD
    public async createAgent(payload: AgentCreateInput): Promise<Agent> {
        return AgentModel.create(payload);
    }

    public async getAgentById(id: Id): Promise<Agent | null> {
        return AgentModel.findById(id);
    }

    public async getAllAgents(): Promise<Agent[]> {
        return AgentModel.find().sort({ createdAt: -1 });
    }

    public async getAgentsPaginated(filters: {
        role?: AgentRole;
        search?: string;
        status?: "active" | "inactive";
        offset?: number;
        limit?: number;
    }): Promise<AgentListItem[]> {
        const { role, search, status, offset = 0, limit = 50 } = filters;
        const match: Record<string, unknown> = {};

        if (role) {
            match.role = role;
        }

        if (status === "active" || status === "inactive") {
            match.status = status;
        }

        if (search && search.trim().length > 0) {
            const value = search.trim();
            match.$or = [
                { name: { $regex: value, $options: "i" } },
                { email: { $regex: value, $options: "i" } },
                { matricule: { $regex: value, $options: "i" } },
            ];
        }

        const data = await AgentModel.aggregate([
            { $match: match },
            { $sort: { createdAt: -1 } },
            { $skip: offset },
            { $limit: limit },
            {
                $lookup: {
                    from: "authorizations",
                    localField: "_id",
                    foreignField: "agentId",
                    as: "authorizations",
                },
            },
            {
                $project: {
                    _id: 0,
                    id: { $toString: "$_id" },
                    name: 1,
                    email: 1,
                    matricule: 1,
                    diplome: 1,
                    status: 1,
                    photo: 1,
                    role: 1,
                    authorizationsCount: { $size: "$authorizations" },
                },
            },
        ]);

        return data as AgentListItem[];
    }

    public async countAgents(filters: {
        role?: AgentRole;
        search?: string;
        status?: "active" | "inactive";
    }): Promise<number> {
        const { role, search, status } = filters;
        const match: Record<string, unknown> = {};
        if (role) {
            match.role = role;
        }
        if (status === "active" || status === "inactive") {
            match.status = status;
        }
        if (search && search.trim().length > 0) {
            const value = search.trim();
            match.$or = [
                { name: { $regex: value, $options: "i" } },
                { email: { $regex: value, $options: "i" } },
                { matricule: { $regex: value, $options: "i" } },
            ];
        }
        return AgentModel.countDocuments(match);
    }

    public async updateAgent(id: Id, payload: AgentUpdateInput): Promise<Agent | null> {
        return AgentModel.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
    }

    public async deleteAgent(id: Id): Promise<Agent | null> {
        return AgentModel.findByIdAndDelete(id);
    }

    // Authorizations CRUD
    public async createAuthorization(payload: AuthorizationCreateInput): Promise<Authorization> {
        return AuthorizationModel.create(payload);
    }

    public async getAuthorizationById(id: Id): Promise<Authorization | null> {
        return AuthorizationModel.findById(id);
    }

    public async getAllAuthorizations(): Promise<Authorization[]> {
        return AuthorizationModel.find().sort({ createdAt: -1 });
    }

    public async updateAuthorization(
        id: Id,
        payload: AuthorizationUpdateInput
    ): Promise<Authorization | null> {
        return AuthorizationModel.findByIdAndUpdate(id, payload, {
            new: true,
            runValidators: true,
        });
    }

    public async deleteAuthorization(id: Id): Promise<Authorization | null> {
        return AuthorizationModel.findByIdAndDelete(id);
    }
}

export default UserManager.getInstance();
export { UserManager };