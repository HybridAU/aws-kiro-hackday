import OpenAI from 'openai';
import type {
  Application,
  Category,
  AIResponse,
  FieldUpdate,
  CategorizationResult,
  RankingCriterion,
  CriterionScore,
  ApplicationFormData,
  Message,
} from '@dove-grants/shared';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      return withRetry(fn, retries - 1);
    }
    throw error;
  }
}

export async function processApplicantMessage(
  message: string,
  conversationHistory: Message[],
  currentFormData: Partial<ApplicationFormData>
): Promise<AIResponse> {
  const systemPrompt = `You are a friendly AI assistant helping someone apply for a grant. 
Your job is to have a natural conversation and extract information for the grant application form.

The form has these fields:
- applicantName: The applicant's full name
- applicantEmail: Their email address
- projectTitle: A title for their project
- projectDescription: A description of what they want to do
- requestedAmount: How much money they need (as a number)

Current form data: ${JSON.stringify(currentFormData)}

When the user provides information, extract it and include field updates in your response.
Be conversational and helpful. Ask follow-up questions to get missing information.
When all fields are filled, let them know they can submit.

Respond in JSON format:
{
  "message": "Your conversational response",
  "fieldUpdates": [{"field": "fieldName", "value": "extracted value", "confidence": 0.9}],
  "isComplete": false,
  "nextQuestion": "What would you like to know next?"
}`;

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: message },
  ];

  const response = await withRetry(() =>
    openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      response_format: { type: 'json_object' },
    })
  );

  const content = response.choices[0]?.message?.content || '{}';
  const parsed = JSON.parse(content);

  return {
    message: parsed.message || "I'm here to help with your grant application!",
    fieldUpdates: (parsed.fieldUpdates || []) as FieldUpdate[],
    isComplete: parsed.isComplete || false,
    nextQuestion: parsed.nextQuestion || null,
  };
}

export async function categorizeApplication(
  application: Application,
  categories: Category[]
): Promise<CategorizationResult> {
  const categoryList = categories.map((c) => `- ${c.id}: ${c.name} - ${c.description}`).join('\n');

  const prompt = `Categorize this grant application into one of the available categories.

Application:
Title: ${application.projectTitle}
Description: ${application.projectDescription}
Requested Amount: $${application.requestedAmount}

Available Categories:
${categoryList}

Respond in JSON format:
{
  "categoryId": "the category id",
  "categoryName": "the category name",
  "explanation": "Why this category fits best",
  "confidence": 85
}`;

  const response = await withRetry(() =>
    openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    })
  );

  const content = response.choices[0]?.message?.content || '{}';
  const parsed = JSON.parse(content);

  // Validate the result
  const category = categories.find((c) => c.id === parsed.categoryId);
  if (!category) {
    // Default to first category if AI returns invalid
    return {
      categoryId: categories[0]?.id || '',
      categoryName: categories[0]?.name || 'Unknown',
      explanation: 'Auto-assigned to default category',
      confidence: 50,
    };
  }

  return {
    categoryId: parsed.categoryId,
    categoryName: parsed.categoryName || category.name,
    explanation: parsed.explanation || 'Categorized by AI',
    confidence: Math.min(100, Math.max(0, parsed.confidence || 70)),
  };
}

export async function scoreApplicationByCriteria(
  application: Application,
  criteria: RankingCriterion[]
): Promise<CriterionScore[]> {
  const criteriaList = criteria
    .map((c) => `- ${c.id}: ${c.name} (weight: ${c.weight}%) - ${c.description}`)
    .join('\n');

  const prompt = `Score this grant application on each criterion from 0-100.

Application:
Title: ${application.projectTitle}
Description: ${application.projectDescription}
Requested Amount: $${application.requestedAmount}

Criteria:
${criteriaList}

Respond in JSON format:
{
  "scores": [
    {
      "criterionId": "criterion id",
      "score": 75,
      "reasoning": "Brief explanation for this score"
    }
  ]
}`;

  const response = await withRetry(() =>
    openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    })
  );

  const content = response.choices[0]?.message?.content || '{}';
  const parsed = JSON.parse(content);

  return criteria.map((criterion) => {
    const aiScore = parsed.scores?.find((s: { criterionId: string }) => s.criterionId === criterion.id);
    const score = Math.min(100, Math.max(0, aiScore?.score || 50));
    const weightedScore = (score * criterion.weight) / 100;

    return {
      criterionId: criterion.id,
      criterionName: criterion.name,
      score,
      weight: criterion.weight,
      weightedScore,
      reasoning: aiScore?.reasoning || 'Score assigned by AI',
    };
  });
}

export function isAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}
