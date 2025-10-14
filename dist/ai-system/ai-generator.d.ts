import { AIAgent } from './ai-schema.js';
export declare class AIGenerator {
    private usedPorts;
    private createdCount;
    generateAllAIs(): Promise<AIAgent[]>;
    private generateTeamAIs;
    private generateSingleAI;
    private allocatePort;
    private selectWeightedPersonality;
    private generateAIName;
    private generatePersonality;
    private generateSkills;
    private getTeamBaseSkills;
    private getPersonalitySkillBonus;
    private generateInitialStatus;
    private varyTrait;
    private combineSkillValues;
    private generateSpecialties;
    private generateExperienceLevel;
    private randomChoice;
    private shuffleArray;
}
export declare const aiGenerator: AIGenerator;
//# sourceMappingURL=ai-generator.d.ts.map