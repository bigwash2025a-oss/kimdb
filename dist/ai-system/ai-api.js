import { aiGenerator } from './ai-generator.js';
let aiDatabase = new Map();
let isInitialized = false;
export async function registerAIRoutes(fastify) {
    fastify.get('/ai/init', async (request, reply) => {
        if (isInitialized) {
            return reply.code(200).send({
                success: true,
                message: 'AI system already initialized',
                count: aiDatabase.size
            });
        }
        console.log('🤖 Initializing AI system...');
        const startTime = Date.now();
        try {
            const allAIs = await aiGenerator.generateAllAIs();
            aiDatabase.clear();
            for (const ai of allAIs) {
                aiDatabase.set(ai.id, ai);
            }
            isInitialized = true;
            const elapsed = Date.now() - startTime;
            console.log(`✅ AI system initialized in ${elapsed}ms`);
            return reply.code(200).send({
                success: true,
                message: 'AI system initialized successfully',
                count: allAIs.length,
                initTime: elapsed,
                teams: {
                    CODE1: allAIs.filter(ai => ai.codeTeam === 'CODE1').length,
                    CODE2: allAIs.filter(ai => ai.codeTeam === 'CODE2').length,
                    CODE3: allAIs.filter(ai => ai.codeTeam === 'CODE3').length,
                    CODE4: allAIs.filter(ai => ai.codeTeam === 'CODE4').length
                }
            });
        }
        catch (error) {
            return reply.code(500).send({
                success: false,
                error: error.message
            });
        }
    });
    fastify.get('/ai', async (request, reply) => {
        const { team, personality, status, experience, skill, limit = 50, offset = 0 } = request.query;
        let filteredAIs = Array.from(aiDatabase.values());
        if (team) {
            filteredAIs = filteredAIs.filter(ai => ai.codeTeam === team);
        }
        if (personality) {
            filteredAIs = filteredAIs.filter(ai => ai.personality.type === personality);
        }
        if (status) {
            filteredAIs = filteredAIs.filter(ai => ai.status.current === status);
        }
        if (experience) {
            filteredAIs = filteredAIs.filter(ai => ai.skills.experience === experience);
        }
        if (skill) {
            filteredAIs = filteredAIs.filter(ai => ai.skills.specialties.includes(skill));
        }
        const total = filteredAIs.length;
        const paginatedAIs = filteredAIs.slice(offset, offset + limit);
        return reply.send({
            success: true,
            data: paginatedAIs,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + limit < total
            }
        });
    });
    fastify.get('/ai/:id', async (request, reply) => {
        const { id } = request.params;
        const ai = aiDatabase.get(id);
        if (!ai) {
            return reply.code(404).send({
                success: false,
                error: 'AI not found'
            });
        }
        return reply.send({
            success: true,
            data: ai
        });
    });
    fastify.post('/ai/:id/chat', async (request, reply) => {
        const { id } = request.params;
        const { message, context, userId } = request.body;
        const ai = aiDatabase.get(id);
        if (!ai) {
            return reply.code(404).send({
                success: false,
                error: 'AI not found'
            });
        }
        if (ai.status.current !== 'active' && ai.status.current !== 'idle') {
            return reply.code(400).send({
                success: false,
                error: `AI is currently ${ai.status.current}`
            });
        }
        const startTime = Date.now();
        const response = generateAIResponse(ai, message, context);
        ai.lastActive = new Date();
        ai.status.performance.responseTime = Date.now() - startTime;
        const chatResponse = {
            response,
            aiId: ai.id,
            aiName: ai.name,
            personality: ai.personality.type,
            responseTime: Date.now() - startTime,
            timestamp: new Date()
        };
        return reply.send({
            success: true,
            data: chatResponse
        });
    });
    fastify.post('/ai/:id/task', async (request, reply) => {
        const { id } = request.params;
        const taskRequest = request.body;
        const ai = aiDatabase.get(id);
        if (!ai) {
            return reply.code(404).send({
                success: false,
                error: 'AI not found'
            });
        }
        if (ai.status.current === 'busy') {
            return reply.code(400).send({
                success: false,
                error: 'AI is currently busy with another task'
            });
        }
        const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        ai.status.current = 'busy';
        ai.status.currentTask = {
            id: taskId,
            type: taskRequest.type,
            startedAt: new Date(),
            progress: 0
        };
        ai.totalTasks++;
        const estimatedDuration = calculateTaskDuration(ai, taskRequest);
        return reply.send({
            success: true,
            data: {
                taskId,
                aiId: ai.id,
                aiName: ai.name,
                estimatedDuration,
                status: 'started'
            }
        });
    });
    fastify.put('/ai/:id/status', async (request, reply) => {
        const { id } = request.params;
        const { status } = request.body;
        const ai = aiDatabase.get(id);
        if (!ai) {
            return reply.code(404).send({
                success: false,
                error: 'AI not found'
            });
        }
        ai.status.current = status;
        ai.lastActive = new Date();
        return reply.send({
            success: true,
            data: {
                aiId: ai.id,
                status: ai.status.current,
                updatedAt: ai.lastActive
            }
        });
    });
    fastify.get('/ai/stats', async (request, reply) => {
        const allAIs = Array.from(aiDatabase.values());
        if (allAIs.length === 0) {
            return reply.send({
                success: true,
                data: {
                    total: 0,
                    message: 'No AIs found. Run /ai/init to initialize the system.'
                }
            });
        }
        const stats = {
            total: allAIs.length,
            byTeam: {},
            byPersonality: {},
            byStatus: {},
            byExperience: {},
            averageSkills: {
                technical: {},
                soft: {}
            }
        };
        for (const ai of allAIs) {
            stats.byTeam[ai.codeTeam] = (stats.byTeam[ai.codeTeam] || 0) + 1;
            stats.byPersonality[ai.personality.type] = (stats.byPersonality[ai.personality.type] || 0) + 1;
            stats.byStatus[ai.status.current] = (stats.byStatus[ai.status.current] || 0) + 1;
            stats.byExperience[ai.skills.experience] = (stats.byExperience[ai.skills.experience] || 0) + 1;
        }
        return reply.send({
            success: true,
            data: stats
        });
    });
    fastify.get('/ai/team/:team', async (request, reply) => {
        const { team } = request.params;
        if (!['CODE1', 'CODE2', 'CODE3', 'CODE4'].includes(team)) {
            return reply.code(400).send({
                success: false,
                error: 'Invalid team. Must be CODE1, CODE2, CODE3, or CODE4'
            });
        }
        const teamAIs = Array.from(aiDatabase.values())
            .filter(ai => ai.codeTeam === team)
            .sort((a, b) => a.name.localeCompare(b.name));
        return reply.send({
            success: true,
            data: teamAIs,
            count: teamAIs.length
        });
    });
    fastify.get('/ai/search', async (request, reply) => {
        const { q, limit = 20 } = request.query;
        if (!q || q.length < 2) {
            return reply.code(400).send({
                success: false,
                error: 'Query must be at least 2 characters long'
            });
        }
        const query = q.toLowerCase();
        const matchingAIs = Array.from(aiDatabase.values())
            .filter(ai => ai.name.toLowerCase().includes(query) ||
            ai.personality.tags.some(tag => tag.toLowerCase().includes(query)) ||
            ai.skills.specialties.some(spec => spec.toLowerCase().includes(query)))
            .slice(0, limit);
        return reply.send({
            success: true,
            data: matchingAIs,
            count: matchingAIs.length
        });
    });
}
function generateAIResponse(ai, message, context) {
    const personality = ai.personality;
    const style = personality.responseStyle;
    const responses = [
        `안녕하세요! 저는 ${ai.name}입니다.`,
        `${message}에 대해 말씀드리자면,`,
        `제 전문분야는 ${ai.skills.specialties.join(', ')}입니다.`,
        `${ai.codeTeam} 팀에서 활동하고 있어요.`
    ];
    let response = responses[Math.floor(Math.random() * responses.length)];
    if (personality.type === 'ANALYZER') {
        response = `분석해보면, ${message}의 경우 체계적인 접근이 필요합니다. 데이터를 기반으로 판단하는 것이 중요하겠네요.`;
    }
    else if (personality.type === 'CREATOR') {
        response = `와! 정말 흥미로운 아이디어네요! 🎨 ${message}를 더 창의적으로 접근해보면 어떨까요?`;
    }
    else if (personality.type === 'LEADER') {
        response = `${message}에 대해 리더십 관점에서 말씀드리면, 전략적으로 접근해야 합니다. 팀을 이끌어본 경험으로 보면...`;
    }
    else if (personality.type === 'SUPPORTER') {
        response = `도움이 필요하시군요! 😊 ${message}에 대해 제가 최선을 다해 지원해드리겠습니다. 함께 해결해봐요!`;
    }
    if (style.emoji && Math.random() > 0.5) {
        const emojis = ['✨', '🚀', '💡', '⚡', '🎯', '👍', '🔥'];
        response += ` ${emojis[Math.floor(Math.random() * emojis.length)]}`;
    }
    if (style.formality === 'formal') {
        response = response.replace(/요!/g, '습니다.').replace(/어요/g, '습니다');
    }
    return response;
}
function calculateTaskDuration(ai, task) {
    const baseTime = 3600;
    const experienceMultiplier = {
        junior: 1.5,
        mid: 1.0,
        senior: 0.7,
        expert: 0.5
    };
    const priorityMultiplier = {
        low: 0.8,
        medium: 1.0,
        high: 1.2,
        urgent: 1.5
    };
    const adjustedTime = baseTime *
        experienceMultiplier[ai.skills.experience] *
        priorityMultiplier[task.priority] *
        (0.8 + Math.random() * 0.4);
    return Math.round(adjustedTime);
}
//# sourceMappingURL=ai-api.js.map