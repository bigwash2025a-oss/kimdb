import { SimpleAI } from '../ai-system/ai-simple.js';
export interface StoredAI extends SimpleAI {
    storedAt: Date;
    version: number;
    lastInteraction?: Date;
    totalInteractions: number;
}
export interface AIInteraction {
    id: string;
    aiId: string;
    userId?: string;
    message: string;
    response: string;
    timestamp: Date;
    responseTime: number;
}
export interface AICollection {
    id: string;
    name: string;
    description: string;
    aiIds: string[];
    createdAt: Date;
    tags: string[];
}
export declare class AIDatabase {
    private db;
    private dbPath;
    constructor();
    private initializeTables;
    saveAIs(ais: SimpleAI[]): Promise<void>;
    getAIs(options?: {
        team?: string;
        personality?: string;
        status?: string;
        limit?: number;
        offset?: number;
        skills?: string;
    }): Promise<StoredAI[]>;
    getAI(id: string): Promise<StoredAI | null>;
    saveInteraction(interaction: {
        aiId: string;
        userId?: string;
        message: string;
        response: string;
        responseTime: number;
    }): Promise<string>;
    getInteractions(aiId: string, limit?: number): Promise<AIInteraction[]>;
    createCollection(collection: {
        name: string;
        description?: string;
        aiIds: string[];
        tags?: string[];
    }): Promise<string>;
    getStats(): Promise<{
        totalAIs: number;
        byTeam: Record<string, number>;
        byPersonality: Record<string, number>;
        byStatus: Record<string, number>;
        totalInteractions: number;
        averageInteractionsPerAI: number;
        mostActiveAI?: {
            id: string;
            name: string;
            interactions: number;
        };
    }>;
    searchAIs(query: string, limit?: number): Promise<StoredAI[]>;
    getDatabaseInfo(): {
        path: string;
        size: number;
        tables: string[];
        pragma: any;
    };
    private getDatabaseSize;
    close(): void;
}
export declare const aiDatabase: AIDatabase;
//# sourceMappingURL=ai-storage.d.ts.map