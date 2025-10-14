import { AI_TEAM_CONFIGS, PERSONALITY_TEMPLATES, TEAM_PERSONALITY_WEIGHTS } from './ai-schema.js';
export class AIGenerator {
    usedPorts = new Set();
    createdCount = 0;
    async generateAllAIs() {
        const allAIs = [];
        console.log('🤖 Starting AI generation for 5000 agents...');
        for (const teamConfig of AI_TEAM_CONFIGS) {
            console.log(`\n👥 Generating ${teamConfig.maxMembers} AIs for ${teamConfig.name}...`);
            const teamAIs = await this.generateTeamAIs(teamConfig.teamCode, teamConfig.maxMembers);
            allAIs.push(...teamAIs);
            console.log(`✅ ${teamConfig.name}: ${teamAIs.length}명 생성 완료`);
        }
        console.log(`\n🎉 Total AI generated: ${allAIs.length}/5000`);
        return allAIs;
    }
    async generateTeamAIs(teamCode, count) {
        const teamAIs = [];
        const teamConfig = AI_TEAM_CONFIGS.find(t => t.teamCode === teamCode);
        const personalityWeights = TEAM_PERSONALITY_WEIGHTS[teamCode];
        for (let i = 0; i < count; i++) {
            const ai = this.generateSingleAI(teamCode, teamConfig, personalityWeights);
            teamAIs.push(ai);
            if ((i + 1) % 100 === 0) {
                console.log(`  Progress: ${i + 1}/${count} (${Math.round((i + 1) / count * 100)}%)`);
            }
        }
        return teamAIs;
    }
    generateSingleAI(teamCode, teamConfig, personalityWeights) {
        this.createdCount++;
        const id = `ai_${this.createdCount.toString().padStart(4, '0')}`;
        const port = this.allocatePort(teamConfig.portRange);
        const personalityType = this.selectWeightedPersonality(personalityWeights);
        const ai = {
            id,
            name: this.generateAIName(personalityType, teamCode),
            codeTeam: teamCode,
            port,
            personality: this.generatePersonality(personalityType),
            skills: this.generateSkills(teamCode, personalityType),
            status: this.generateInitialStatus(),
            createdAt: new Date(),
            lastActive: new Date(),
            totalTasks: 0,
            successRate: 85 + Math.random() * 15
        };
        return ai;
    }
    allocatePort(portRange) {
        let attempts = 0;
        while (attempts < 1000) {
            const port = portRange.start + Math.floor(Math.random() * (portRange.end - portRange.start + 1));
            if (!this.usedPorts.has(port)) {
                this.usedPorts.add(port);
                return port;
            }
            attempts++;
        }
        throw new Error(`Cannot allocate port in range ${portRange.start}-${portRange.end}`);
    }
    selectWeightedPersonality(weights) {
        const random = Math.random();
        let cumulative = 0;
        for (const [type, weight] of Object.entries(weights)) {
            cumulative += weight;
            if (random <= cumulative) {
                return type;
            }
        }
        return 'SUPPORTER';
    }
    generateAIName(personalityType, teamCode) {
        const prefixes = {
            ANALYZER: ['분석', '논리', '체계', '정밀'],
            CREATOR: ['창조', '혁신', '상상', '발명'],
            LEADER: ['지휘', '통솔', '주도', '결단'],
            SUPPORTER: ['지원', '협력', '도움', '친화'],
            EXPLORER: ['탐험', '모험', '실험', '발견'],
            GUARDIAN: ['수호', '보호', '안전', '방어'],
            PERFORMER: ['표현', '연기', '매력', '활기'],
            MEDIATOR: ['중재', '조화', '균형', '평화']
        };
        const suffixes = {
            CODE1: ['디자이너', '크리에이터', '아티스트', '마스터'],
            CODE2: ['엔지니어', '아키텍트', '빌더', '개발자'],
            CODE3: ['커맨더', '전략가', '매니저', '리더'],
            CODE4: ['가디언', '워처', '프로텍터', '시큐어']
        };
        const prefix = this.randomChoice(prefixes[personalityType]);
        const suffix = this.randomChoice(suffixes[teamCode]);
        const number = Math.floor(Math.random() * 999) + 1;
        return `${prefix}${suffix}_${number}`;
    }
    generatePersonality(type) {
        const template = PERSONALITY_TEMPLATES[type];
        const personality = {
            traits: {
                creativity: this.varyTrait(template.traits.creativity),
                logic: this.varyTrait(template.traits.logic),
                social: this.varyTrait(template.traits.social),
                energy: this.varyTrait(template.traits.energy),
                stability: this.varyTrait(template.traits.stability)
            },
            type,
            tags: [...template.tags],
            responseStyle: { ...template.responseStyle }
        };
        const additionalTags = ['효율적', '신뢰할만한', '열정적', '꼼꼼한', '유연한', '진취적'];
        if (Math.random() > 0.5) {
            personality.tags.push(this.randomChoice(additionalTags));
        }
        return personality;
    }
    generateSkills(teamCode, personalityType) {
        const baseSkills = this.getTeamBaseSkills(teamCode);
        const personalityBonus = this.getPersonalitySkillBonus(personalityType);
        return {
            technical: {
                programming: this.combineSkillValues(baseSkills.technical.programming, personalityBonus.technical.programming),
                database: this.combineSkillValues(baseSkills.technical.database, personalityBonus.technical.database),
                security: this.combineSkillValues(baseSkills.technical.security, personalityBonus.technical.security),
                frontend: this.combineSkillValues(baseSkills.technical.frontend, personalityBonus.technical.frontend),
                backend: this.combineSkillValues(baseSkills.technical.backend, personalityBonus.technical.backend),
                devops: this.combineSkillValues(baseSkills.technical.devops, personalityBonus.technical.devops)
            },
            soft: {
                communication: this.combineSkillValues(baseSkills.soft.communication, personalityBonus.soft.communication),
                problemSolving: this.combineSkillValues(baseSkills.soft.problemSolving, personalityBonus.soft.problemSolving),
                teamwork: this.combineSkillValues(baseSkills.soft.teamwork, personalityBonus.soft.teamwork),
                leadership: this.combineSkillValues(baseSkills.soft.leadership, personalityBonus.soft.leadership),
                adaptability: this.combineSkillValues(baseSkills.soft.adaptability, personalityBonus.soft.adaptability),
                learning: this.combineSkillValues(baseSkills.soft.learning, personalityBonus.soft.learning)
            },
            specialties: this.generateSpecialties(teamCode, personalityType),
            experience: this.generateExperienceLevel()
        };
    }
    getTeamBaseSkills(teamCode) {
        const teamSkills = {
            CODE1: {
                technical: { programming: 85, database: 40, security: 50, frontend: 90, backend: 30, devops: 40 },
                soft: { communication: 80, problemSolving: 75, teamwork: 85, leadership: 60, adaptability: 80, learning: 75 }
            },
            CODE2: {
                technical: { programming: 90, database: 85, security: 70, frontend: 40, backend: 95, devops: 80 },
                soft: { communication: 70, problemSolving: 90, teamwork: 75, leadership: 65, adaptability: 75, learning: 80 }
            },
            CODE3: {
                technical: { programming: 75, database: 70, security: 75, frontend: 60, backend: 70, devops: 70 },
                soft: { communication: 90, problemSolving: 85, teamwork: 80, leadership: 95, adaptability: 85, learning: 85 }
            },
            CODE4: {
                technical: { programming: 80, database: 75, security: 95, frontend: 50, backend: 75, devops: 85 },
                soft: { communication: 75, problemSolving: 90, teamwork: 80, leadership: 70, adaptability: 70, learning: 75 }
            }
        };
        return teamSkills[teamCode];
    }
    getPersonalitySkillBonus(personalityType) {
        const bonuses = {
            ANALYZER: {
                technical: { programming: 10, database: 15, security: 10, frontend: 0, backend: 10, devops: 5 },
                soft: { communication: -5, problemSolving: 15, teamwork: 0, leadership: 0, adaptability: 0, learning: 10 }
            },
            CREATOR: {
                technical: { programming: 5, database: 0, security: 0, frontend: 15, backend: 0, devops: 0 },
                soft: { communication: 5, problemSolving: 10, teamwork: 5, leadership: 0, adaptability: 15, learning: 10 }
            },
            LEADER: {
                technical: { programming: 0, database: 0, security: 5, frontend: 0, backend: 0, devops: 10 },
                soft: { communication: 15, problemSolving: 5, teamwork: 10, leadership: 20, adaptability: 10, learning: 5 }
            },
        };
        return bonuses[personalityType] || bonuses.ANALYZER;
    }
    generateInitialStatus() {
        return {
            current: 'active',
            performance: {
                cpuUsage: 10 + Math.random() * 20,
                memoryUsage: 20 + Math.random() * 30,
                responseTime: 50 + Math.random() * 100,
                uptime: 0
            },
            health: {
                score: 90 + Math.random() * 10,
                lastCheck: new Date(),
                issues: []
            }
        };
    }
    varyTrait(baseValue) {
        const variation = (Math.random() - 0.5) * 20;
        return Math.max(0, Math.min(100, baseValue + variation));
    }
    combineSkillValues(base, bonus) {
        return Math.max(0, Math.min(100, base + bonus + (Math.random() - 0.5) * 10));
    }
    generateSpecialties(teamCode, personalityType) {
        const teamSpecialties = {
            CODE1: ['React', 'Vue.js', 'TypeScript', 'CSS3', 'Webpack', 'Sass', 'UI/UX', '반응형디자인'],
            CODE2: ['Node.js', 'Python', 'PostgreSQL', 'MongoDB', 'Docker', 'Kubernetes', 'AWS', 'Redis'],
            CODE3: ['시스템설계', '프로젝트관리', '마이크로서비스', '데이터분석', '전략수립', 'DevOps'],
            CODE4: ['보안감사', 'SSL/TLS', '침투테스트', '모니터링', 'ELK스택', '컴플라이언스', 'OWASP']
        };
        const specialties = teamSpecialties[teamCode] || [];
        const selectedCount = 2 + Math.floor(Math.random() * 3);
        return this.shuffleArray([...specialties]).slice(0, selectedCount);
    }
    generateExperienceLevel() {
        const rand = Math.random();
        if (rand < 0.3)
            return 'junior';
        if (rand < 0.6)
            return 'mid';
        if (rand < 0.85)
            return 'senior';
        return 'expert';
    }
    randomChoice(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}
export const aiGenerator = new AIGenerator();
//# sourceMappingURL=ai-generator.js.map