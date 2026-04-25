import { Types } from "mongoose";
import {
    Agent,
    AgentModel,
    Authorization,
    AuthorizationModel,
    Student,
    StudentModel,
} from "../models/User";

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

    public async updateStudent(id: Id, payload: StudentUpdateInput): Promise<Student | null> {
        return StudentModel.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
    }

    public async deleteStudent(id: Id): Promise<Student | null> {
        return StudentModel.findByIdAndDelete(id);
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