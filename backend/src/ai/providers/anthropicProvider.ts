/**
 * Anthropic Claude AI Provider
 */
import Anthropic from '@anthropic-ai/sdk';
import { AiProvider, TaskAnalysisInput } from '../types';
import { AiAnalysisResult } from '../../repositories/taskAiAnalysisRepository';
import { config } from '../../infra/config';
import { logger } from '../../infra/logger';

class AnthropicProviderImpl implements AiProvider {
  name = 'anthropic';
  private client: Anthropic;
  private model = 'claude-sonnet-4-20250514';

  constructor() {
    if (!config.anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY 未配置');
    }
    this.client = new Anthropic({
      apiKey: config.anthropicApiKey,
    });
  }

  async analyzeTask(input: TaskAnalysisInput): Promise<{
    result: AiAnalysisResult;
    tokenUsage?: number;
  }> {
    const prompt = this.buildPrompt(input);

    logger.info(`调用 Anthropic API，模型: ${this.model}`);

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      // 提取文本内容
      const textContent = response.content.find((block) => block.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('API 响应中没有文本内容');
      }

      // 解析 JSON 结果
      const result = this.parseResponse(textContent.text);
      const tokenUsage = response.usage.input_tokens + response.usage.output_tokens;

      logger.info(`Anthropic API 调用成功，使用 tokens: ${tokenUsage}`);

      return { result, tokenUsage };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Anthropic API 调用失败: ${message}`);
      throw new Error(`AI 分析失败: ${message}`);
    }
  }

  private buildPrompt(input: TaskAnalysisInput): string {
    const { task, recentEvents, context } = input;

    return `你是一个专业的任务管理助手。请分析以下任务并提供结构化建议。

## 任务信息

- 标题：${task.title}
- 描述：${task.description || '无'}
- 状态：${task.status}
- 优先级：${task.priority}
- 创建时间：${task.createdAt.toISOString()}
- 更新时间：${task.updatedAt.toISOString()}
- 截止日期：${task.dueDate?.toISOString() || '未设置'}
- 负责人：${task.assignee?.name || '未分配'}

## 子任务完成情况

${task.subTasks.length > 0
  ? task.subTasks.map((s) => `- [${s.status === 'done' ? '✓' : ' '}] ${s.title}`).join('\n')
  : '无子任务'}

## 近期动态

${recentEvents.length > 0
  ? recentEvents.map((e) => `- ${e.createdAt.toISOString()}: ${e.type}`).join('\n')
  : '无近期动态'}

## 项目背景

- 所属项目：${context.projectName}
- 项目进度：${context.completedProjectTasks}/${context.totalProjectTasks} 任务完成

---

请用 JSON 格式返回分析结果，只返回 JSON，不要包含其他内容：

{
  "progress_assessment": {
    "percentage": 0-100 的整数,
    "status": "on_track" | "at_risk" | "delayed" | "blocked",
    "summary": "一句话总结当前进度"
  },
  "next_actions": [
    {
      "action": "具体可执行的下一步",
      "priority": "high" | "medium" | "low",
      "estimated_minutes": 预估分钟数
    }
  ],
  "risks": [
    {
      "description": "风险描述",
      "severity": "high" | "medium" | "low",
      "mitigation": "建议的缓解措施"
    }
  ],
  "insights": "其他观察或建议"
}

注意：
1. next_actions 最多 5 条，按优先级排序
2. risks 只列出真实存在的风险，没有则返回空数组
3. 所有建议必须具体、可执行，避免空泛的描述
4. 只返回 JSON，不要有任何其他文字`;
  }

  private parseResponse(text: string): AiAnalysisResult {
    // 尝试提取 JSON
    let jsonStr = text.trim();

    // 如果被 markdown 代码块包裹，提取出来
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    try {
      const parsed = JSON.parse(jsonStr);

      // 验证必要字段
      if (!parsed.progress_assessment || !Array.isArray(parsed.next_actions) || !Array.isArray(parsed.risks)) {
        throw new Error('响应格式不完整');
      }

      // 确保字段类型正确
      return {
        progress_assessment: {
          percentage: Math.min(100, Math.max(0, parseInt(parsed.progress_assessment.percentage) || 0)),
          status: this.validateStatus(parsed.progress_assessment.status),
          summary: String(parsed.progress_assessment.summary || ''),
        },
        next_actions: parsed.next_actions.slice(0, 5).map((action: Record<string, unknown>) => ({
          action: String(action.action || ''),
          priority: this.validatePriority(String(action.priority || 'medium')),
          estimated_minutes: parseInt(String(action.estimated_minutes)) || 30,
        })),
        risks: parsed.risks.map((risk: Record<string, unknown>) => ({
          description: String(risk.description || ''),
          severity: this.validateSeverity(String(risk.severity || 'medium')),
          mitigation: String(risk.mitigation || ''),
        })),
        insights: parsed.insights ? String(parsed.insights) : undefined,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`解析 AI 响应失败: ${message}, 原始响应: ${text.slice(0, 500)}`);
      throw new Error('AI 响应格式解析失败');
    }
  }

  private validateStatus(status: string): 'on_track' | 'at_risk' | 'delayed' | 'blocked' {
    const valid = ['on_track', 'at_risk', 'delayed', 'blocked'];
    return valid.includes(status) ? (status as 'on_track' | 'at_risk' | 'delayed' | 'blocked') : 'on_track';
  }

  private validatePriority(priority: string): 'high' | 'medium' | 'low' {
    const valid = ['high', 'medium', 'low'];
    return valid.includes(priority) ? (priority as 'high' | 'medium' | 'low') : 'medium';
  }

  private validateSeverity(severity: string): 'high' | 'medium' | 'low' {
    const valid = ['high', 'medium', 'low'];
    return valid.includes(severity) ? (severity as 'high' | 'medium' | 'low') : 'medium';
  }

  /**
   * 通用 prompt 分析方法
   * 用于团队树分析和项目全景分析
   */
  async analyzeWithPrompt<T>(prompt: string): Promise<T> {
    logger.info(`调用 Anthropic API 进行树分析，模型: ${this.model}`);

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 3000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const textContent = response.content.find((block) => block.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('API 响应中没有文本内容');
      }

      // 解析 JSON
      let jsonStr = textContent.text.trim();
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      const result = JSON.parse(jsonStr) as T;
      const tokenUsage = response.usage.input_tokens + response.usage.output_tokens;
      logger.info(`Anthropic API 树分析完成，使用 tokens: ${tokenUsage}`);
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Anthropic API 树分析失败: ${message}`);
      throw new Error(`AI 分析失败: ${message}`);
    }
  }
}

// 延迟初始化的单例
let instance: AnthropicProviderImpl | null = null;

export function getAnthropicProvider(): AiProvider {
  if (!instance) {
    instance = new AnthropicProviderImpl();
  }
  return instance;
}

