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
        offset?: number;
        limit?: number;
    }): Promise<StudentListItem[]> {
        const { cycle, search, offset = 0, limit = 50 } = filters;
        const match: Record<string, unknown> = {};

        if (cycle && STUDENT_CYCLES.includes(cycle as (typeof STUDENT_CYCLES)[number])) {
            match.cycle = cycle;
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
        return RechargeModel.create({
            studentId: student._id,
            amount: deposit.amount,
            currency: deposit.currency,
            phoneNumber: deposit.phoneNumber,
            status: "pending",
        });
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
        await RechargeModel.insertMany(
            s.deposits.map((d) => ({
                studentId: sid,
                amount: d.amount,
                currency: d.currency,
                phoneNumber: d.phoneNumber,
                orderNumber: d.orderNumber,
                status: (d.status as "pending" | "paid" | "failed") ?? "pending",
            }))
        );
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
        return RechargeModel.findByIdAndUpdate(
            rechargeId,
            { $set: { orderNumber } },
            { new: true, runValidators: true }
        );
    }

    public async setRechargeStatus(
        rechargeId: Id,
        status: "pending" | "paid" | "failed"
    ): Promise<RechargeDoc | null> {
        return RechargeModel.findByIdAndUpdate(
            rechargeId,
            { $set: { status } },
            { new: true, runValidators: true }
        );
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
        offset?: number;
        limit?: number;
    }): Promise<AgentListItem[]> {
        const { role, search, offset = 0, limit = 50 } = filters;
        const match: Record<string, unknown> = {};

        if (role) {
            match.role = role;
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