/**
 * OpenAI API mock, scenario "rate-limited": Every request is rate limited.
 *
 * Every request is a 429 rate_limit_exceeded, with retry-after and x-ratelimit-* headers.
 *
 * Sections: SCENARIO (this scenario's settings), DATA (test data), API (the endpoints and how
 * they behave), RUNTIME (routing, state, request parsing, the docs page and the server), and
 * META and SPEC (what the docs page shows, and what the mock takes from the API's spec).
 */
'use strict';

// ═══ SCENARIO ════════════════════════════════════════════════════════════════════════════════════
const SCENARIO = Object.freeze({"name":"rate-limited","failAll":"rateLimited"});

// ═══ DATA ════════════════════════════════════════════════════════════════════════════════════════
const DATA = {
  "ERRORS": {
    "missingSession": {
      "status": 400,
      "type": "invalid_request_error",
      "code": "missing_mock_session",
      "message": "{message}"
    },
    "invalidApiKey": {
      "status": 401,
      "type": "invalid_request_error",
      "code": "invalid_api_key",
      "message": "Incorrect API key provided: {key}. You can find your API key at https://platform.openai.com/account/api-keys."
    },
    "missingParameter": {
      "status": 400,
      "type": "invalid_request_error",
      "code": "missing_required_parameter",
      "message": "Missing required parameter: '{name}'."
    },
    "emptyArray": {
      "status": 400,
      "type": "invalid_request_error",
      "code": "empty_array",
      "message": "Invalid '{name}': empty array. Expected an array with minimum length 1, but got an empty array instead."
    },
    "invalidValue": {
      "status": 400,
      "type": "invalid_request_error",
      "code": "invalid_value",
      "message": "Invalid value: '{value}'. Supported values are: {supported}."
    },
    "unknownParameter": {
      "status": 400,
      "type": "invalid_request_error",
      "code": "unknown_parameter",
      "message": "Unrecognized request argument supplied: {name}"
    },
    "modelNotFound": {
      "status": 404,
      "type": "invalid_request_error",
      "code": "model_not_found",
      "message": "The model `{model}` does not exist or you do not have access to it."
    },
    "notFound": {
      "status": 404,
      "type": "invalid_request_error",
      "code": null,
      "message": "No {kind} found with id '{id}'."
    },
    "invalidUrl": {
      "status": 404,
      "type": "invalid_request_error",
      "code": null,
      "message": "Invalid URL ({method} {path})"
    },
    "invalidJson": {
      "status": 400,
      "type": "invalid_request_error",
      "code": null,
      "message": "We could not parse the JSON body of your request. (HINT: This likely means you aren't using your HTTP library correctly. The OpenAI API expects a JSON payload, but what was sent was not valid JSON. If you have trouble figuring out how to fix this, please contact us through our help center at help.openai.com.)"
    },
    "dimensions": {
      "status": 400,
      "type": "invalid_request_error",
      "code": null,
      "message": "This model does not support specifying dimensions."
    },
    "contextLength": {
      "status": 400,
      "type": "invalid_request_error",
      "code": "context_length_exceeded",
      "message": "This model's maximum context length is {limit} tokens. However, your messages resulted in {tokens} tokens. Please reduce the length of the messages."
    },
    "previousResponse": {
      "status": 404,
      "type": "invalid_request_error",
      "code": "previous_response_not_found",
      "message": "Previous response with id '{id}' not found."
    },
    "rateLimited": {
      "status": 429,
      "type": "requests",
      "code": "rate_limit_exceeded",
      "message": "Rate limit reached for {model} in organization org-mock on requests per min (RPM): Limit 500, Used 500, Requested 1. Please try again in 120ms. Visit https://platform.openai.com/account/rate-limits to learn more."
    },
    "insufficientQuota": {
      "status": 429,
      "type": "insufficient_quota",
      "code": "insufficient_quota",
      "message": "You exceeded your current quota, please check your plan and billing details. For more information on this error, read the docs: https://platform.openai.com/docs/guides/error-codes/api-errors."
    },
    "serverError": {
      "status": 500,
      "type": "server_error",
      "code": null,
      "message": "The server had an error while processing your request. Sorry about that!"
    },
    "overloaded": {
      "status": 503,
      "type": "server_error",
      "code": null,
      "message": "The engine is currently overloaded, please try again later."
    }
  },
  "MARKERS": {
    "refuse": "[mock:refuse]",
    "length": "[mock:length]",
    "contentFilter": "[mock:content_filter]",
    "contextLength": "[mock:context_length]",
    "text": "[mock:text]",
    "flagged": "[mock:flagged"
  },
  "EMBEDDING_DIMENSIONS": {
    "text-embedding-3-small": 1536,
    "text-embedding-3-large": 3072,
    "text-embedding-ada-002": 1536
  },
  "CONTEXT_TOKENS": 128000,
  "REFUSAL": "I'm sorry, but I can't help with that.",
  "MODEL_CREATED": 1715367049
};

// @endpoint POST /v1/chat/completions
// @endpoint GET /v1/chat/completions
// @endpoint GET /v1/chat/completions/:completion_id
// @endpoint DELETE /v1/chat/completions/:completion_id
// @endpoint POST /v1/responses
// @endpoint GET /v1/responses/:response_id
// @endpoint DELETE /v1/responses/:response_id
// @endpoint POST /v1/embeddings
// @endpoint POST /v1/moderations
// @endpoint GET /v1/models
// @endpoint GET /v1/models/:model

// ═══ API ═════════════════════════════════════════════════════════════════════════════════════════
/* global SCENARIO, DATA, SPEC, store, now, view, route, provider, reply */
// OpenAI's behaviour: Chat Completions (with streaming, tools and structured output), the Responses API, embeddings,
// moderations and models, with OpenAI's errors: `{ error: { message, type, param, code } }`.
// There is no model behind it: answers are deterministic, so tests can assert on them. A reply
// quotes the last user message, JSON follows the requested schema, offered tools are called,
// embeddings come from a hash of the input, and markers in the prompt give the other outcomes.

const { createHash, randomBytes } = require('crypto');
const { Buffer } = require('buffer');
const { ERRORS, MARKERS, EMBEDDING_DIMENSIONS, CONTEXT_TOKENS, REFUSAL, MODEL_CREATED } = DATA;

// ─── Errors ───

const fill = (template, values) => { return template.replace(/\{(\w+)\}/g, (whole, name) => { return values[name] === undefined ? whole : String(values[name]); }); };

class OpenAIError extends Error {
    constructor (kind, values = {}, { param = null, headers } = {}) {
        const { status, type, code, message } = ERRORS[kind];
        const text = fill(message, values);

        super(text);
        this.status = status;
        this.body = { error: { message: text, type, param, code } };
        this.headers = headers;
    }
}

function fail (kind, values, options) {
    return new OpenAIError(kind, values, options);
}

// The headers a rate-limited request gets.
const RATE_LIMIT_HEADERS = { 'retry-after': '1', 'x-ratelimit-limit-requests': '500', 'x-ratelimit-remaining-requests': '0', 'x-ratelimit-reset-requests': '120ms' };

// ─── Values ───

const alnum = (length) => {
    let text = '';

    while (text.length < length) { text += randomBytes(length).toString('base64').replace(/[^A-Za-z0-9]/g, ''); }

    return text.slice(0, length);
};
const hex = (length) => { return randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length); };

// Roughly four characters a token, as OpenAI's own rule of thumb.
const tokens = (text) => { return Math.max(1, Math.ceil(String(text || '').length / 4)); };

// The text of a message's content: a string, or the text of its parts.
function textOf (content) {
    if (typeof content === 'string') { return content; }

    return Array.isArray(content) ? content.map((part) => { return (part && (part.text || part.input_text)) || ''; }).join(' ') : '';
}

const allModels = () => { return [...SPEC.models.text, ...SPEC.models.responses, ...SPEC.models.embedding, ...SPEC.models.moderation]; };
const isKnown = (id, kinds) => { return typeof id === 'string' && (id.startsWith('ft:') || kinds.some((kind) => { return SPEC.models[kind].includes(id); })); };

function requireModel (params, kinds) {
    if (!params.model) { throw fail('missingParameter', { name: 'model' }, { param: 'model' }); }
    if (!isKnown(params.model, kinds)) { throw fail('modelNotFound', { model: params.model }); }
}

// An example value for a JSON Schema: what structured output and tool arguments are filled with.
function example (schema, root, depth = 0) {
    if (!schema || depth > 8) { return null; }
    if (schema.$ref) {
        return example(schema.$ref.replace(/^#\//, '').split('/').reduce((node, key) => { return node && node[key]; }, root), root, depth + 1);
    }
    if ('const' in schema) { return schema.const; }
    if (schema.enum) { return schema.enum[0]; }

    const choices = schema.anyOf || schema.oneOf;

    if (choices) { return example(choices.find((choice) => { return choice.type !== 'null'; }) || choices[0], root, depth + 1); }
    if (schema.allOf) { return Object.assign({}, ...schema.allOf.map((part) => { return example(part, root, depth + 1); })); }

    const type = Array.isArray(schema.type) ? schema.type.find((t) => { return t !== 'null'; }) : schema.type;

    if (type === 'object' || schema.properties) {
        return Object.fromEntries(Object.entries(schema.properties || {}).map(([key, value]) => { return [key, example(value, root, depth + 1)]; }));
    }
    if (type === 'array') { return Array.from({ length: Math.max(1, schema.minItems || 1) }, () => { return example(schema.items || {}, root, depth + 1); }); }
    if (type === 'string') {
        const formats = { 'date-time': '2026-01-01T00:00:00Z', date: '2026-01-01', email: 'user@example.com', uri: 'https://example.com', uuid: '00000000-0000-4000-8000-000000000000' };

        return formats[schema.format] || 'string'.padEnd(schema.minLength || 0, 'x');
    }
    if (type === 'integer' || type === 'number') { return schema.minimum !== undefined ? schema.minimum : 0; }
    if (type === 'boolean') { return false; }

    return null;
}

// ─── What the "model" says ───

function outcomeFor (text) {
    if (SCENARIO.outcome) { return SCENARIO.outcome; }
    if (text.includes(MARKERS.refuse)) { return 'refuse'; }
    if (text.includes(MARKERS.length)) { return 'length'; }
    if (text.includes(MARKERS.contentFilter)) { return 'content_filter'; }

    return null;
}

function quote (text) {
    const clean = String(text).replace(/\[mock:[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();

    return clean.length > 80 ? `${clean.slice(0, 79)}…` : clean;
}

// The reply's text: JSON for structured output, otherwise a sentence quoting what it answers.
function replyText ({ schema, json }, userText, lastRole, lastText) {
    const sentence = lastRole === 'tool' ? `Mock response using the tool result: "${quote(lastText)}"` :
        userText ? `Mock response to: "${quote(userText)}"` : 'Mock response.';

    if (schema) { return JSON.stringify(example(schema, schema)); }
    if (json) { return JSON.stringify({ response: sentence }); }

    return sentence;
}

// The tool the request asks to be called: the one named by tool_choice, the first one for
// "required", or the first one when the last message is the user's (a model would call it).
function chooseTool (tools, choice, lastRole, userText, nameOf) {
    if (!tools.length || choice === 'none' || userText.includes(MARKERS.text)) { return null; }
    if (choice && typeof choice === 'object') {
        const wanted = choice.name || (choice.function && choice.function.name);

        return tools.find((tool) => { return nameOf(tool) === wanted; }) || null;
    }
    if (choice === 'required') { return tools[0]; }

    return lastRole === 'user' ? tools[0] : null;
}

function checkContext (text, promptTokens, param) {
    if (text.includes(MARKERS.contextLength)) { throw fail('contextLength', { limit: CONTEXT_TOKENS, tokens: CONTEXT_TOKENS + promptTokens }, { param }); }
}

// Words with their trailing space, as tokens arrive in a stream.
const pieces = (text, size) => {
    if (size) { return String(text).match(new RegExp(`[\\s\\S]{1,${size}}`, 'g')) || ['']; }

    return String(text).match(/\S+\s*|\s+/g) || [''];
};

const SSE = { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache' };

// ─── Chat Completions ───

function chatUsage (prompt, completion) {
    return {
        prompt_tokens: prompt,
        completion_tokens: completion,
        total_tokens: prompt + completion,
        prompt_tokens_details: { cached_tokens: 0, audio_tokens: 0 },
        completion_tokens_details: { reasoning_tokens: 0, audio_tokens: 0, accepted_prediction_tokens: 0, rejected_prediction_tokens: 0 }
    };
}

function chatFormat (format) {
    if (!format) { return {}; }
    if (format.type === 'json_schema') { return { schema: (format.json_schema && format.json_schema.schema) || {} }; }

    return { json: format.type === 'json_object' };
}

function chatChoice (p, index) {
    const last = p.messages[p.messages.length - 1] || {};
    const userText = textOf((p.messages.filter((m) => { return m && m.role === 'user'; }).pop() || {}).content);
    const outcome = outcomeFor(userText);
    const tools = (p.tools || []).filter((tool) => { return tool && tool.type === 'function' && tool.function; });
    const tool = chooseTool(tools, p.tool_choice, last.role, userText, (t) => { return t.function.name; });
    const message = { role: 'assistant', content: null, refusal: null, annotations: [] };
    const choice = (finish) => { return { index, message, logprobs: null, finish_reason: finish }; };

    if (outcome === 'refuse') {
        message.refusal = REFUSAL;

        return choice('stop');
    }
    if (tool && outcome !== 'length') {
        const parameters = tool.function.parameters || {};

        message.tool_calls = [{ id: `call_${alnum(24)}`, type: 'function', function: { name: tool.function.name, arguments: JSON.stringify(example(parameters, parameters)) } }];

        return choice('tool_calls');
    }
    if (outcome === 'content_filter') {
        message.content = '';

        return choice('content_filter');
    }

    const text = replyText(chatFormat(p.response_format), userText, last.role, textOf(last.content));

    message.content = outcome === 'length' ? text.slice(0, Math.ceil(text.length / 2)) : text;

    return choice(outcome === 'length' ? 'length' : 'stop');
}

// The completion as server-sent events: a role chunk, content (or refusal, or tool call
// arguments) a word at a time, the finish reason, usage if asked for, then [DONE].
function chatStream (completion, p) {
    const base = {
        id: completion.id, object: 'chat.completion.chunk', created: completion.created, model: completion.model,
        service_tier: completion.service_tier, system_fingerprint: completion.system_fingerprint
    };
    const chunk = (index, delta, finish = null) => { return { ...base, choices: [{ index, delta, logprobs: null, finish_reason: finish }] }; };
    const chunks = [];

    for (const { index, message, finish_reason: finish } of completion.choices) {
        chunks.push(chunk(index, { role: 'assistant', content: message.content === null ? null : '', refusal: null }));
        if (message.refusal) { for (const piece of pieces(message.refusal)) { chunks.push(chunk(index, { refusal: piece })); } }
        if (message.content) { for (const piece of pieces(message.content)) { chunks.push(chunk(index, { content: piece })); } }
        (message.tool_calls || []).forEach((call, t) => {
            chunks.push(chunk(index, { tool_calls: [{ index: t, id: call.id, type: 'function', function: { name: call.function.name, arguments: '' } }] }));
            for (const piece of pieces(call.function.arguments, 12)) { chunks.push(chunk(index, { tool_calls: [{ index: t, function: { arguments: piece } }] })); }
        });
        chunks.push(chunk(index, {}, finish));
    }
    if (p.stream_options && p.stream_options.include_usage) { chunks.push({ ...base, choices: [], usage: completion.usage }); }

    return `${chunks.map((c) => { return `data: ${JSON.stringify(c)}\n\n`; }).join('')}data: [DONE]\n\n`;
}

route('POST', '/v1/chat/completions', async (ctx) => {
    const p = ctx.params;

    requireModel(p, ['text']);
    if (!Array.isArray(p.messages)) { throw fail('missingParameter', { name: 'messages' }, { param: 'messages' }); }
    if (!p.messages.length) { throw fail('emptyArray', { name: 'messages' }, { param: 'messages' }); }

    const promptTokens = p.messages.reduce((n, m) => { return n + 4 + tokens(textOf(m && m.content)); }, 3);

    checkContext(textOf((p.messages.filter((m) => { return m && m.role === 'user'; }).pop() || {}).content), promptTokens, 'messages');

    const choices = Array.from({ length: Math.max(1, Number(p.n) || 1) }, (unused, index) => { return chatChoice(p, index); });
    const completionTokens = choices.reduce((n, c) => {
        return n + tokens(c.message.content || c.message.refusal || JSON.stringify(c.message.tool_calls || ''));
    }, 0);
    const completion = {
        id: `chatcmpl-${alnum(29)}`,
        object: 'chat.completion',
        created: now(),
        model: p.model,
        choices,
        usage: chatUsage(promptTokens, completionTokens),
        service_tier: p.service_tier || 'default',
        system_fingerprint: 'fp_mock'
    };

    // Stored completions can be listed, read back and deleted.
    if (p.store === true) { await store.save({ ...completion, metadata: p.metadata || {} }, 'chat_completion'); }

    return p.stream === true ? reply(200, chatStream(completion, p), SSE) : completion;
});

route('GET', '/v1/chat/completions', async (ctx) => {
    const q = ctx.query;
    const limit = Math.min(Number(q.limit) || 20, 100);
    // Filtered by model, and by metadata (`metadata[key]=value`).
    const metadata = q.metadata && typeof q.metadata === 'object' ? q.metadata : {};
    let completions = (await store.all('chat_completion')).filter((c) => {
        return (!q.model || c.model === q.model) && Object.entries(metadata).every(([key, value]) => { return c.metadata && c.metadata[key] === value; });
    });

    if (q.order !== 'desc') { completions = completions.reverse(); }
    if (q.after) { completions = completions.slice(completions.findIndex((c) => { return c.id === q.after; }) + 1); }

    const page = completions.slice(0, limit).map(view);

    return { object: 'list', data: page, first_id: page.length ? page[0].id : null, last_id: page.length ? page[page.length - 1].id : null, has_more: completions.length > limit };
});

async function loadCompletion (id) {
    const completion = await store.get('chat_completion', id);

    if (!completion) { throw fail('notFound', { kind: 'chat completion', id }); }

    return completion;
}

route('GET', '/v1/chat/completions/:completion_id', async (ctx, id) => { return view(await loadCompletion(id)); });

route('DELETE', '/v1/chat/completions/:completion_id', async (ctx, id) => {
    await loadCompletion(id);
    await store.remove('chat_completion', id);

    return { object: 'chat.completion.deleted', id, deleted: true };
});

// ─── Responses ───

// The input as items: a string is one user message.
function inputItems (input) {
    if (typeof input === 'string') { return [{ type: 'message', role: 'user', content: input }]; }

    return Array.isArray(input) ? input : [];
}

const roleOf = (item) => { return item && item.type === 'function_call_output' ? 'tool' : item && item.role; };

function responseFormat (text) {
    const format = text && text.format;

    if (!format) { return {}; }
    if (format.type === 'json_schema') { return { schema: format.schema || {} }; }

    return { json: format.type === 'json_object' };
}

function responseOutput (p, items) {
    const last = items[items.length - 1] || {};
    const userText = textOf((items.filter((item) => { return roleOf(item) === 'user'; }).pop() || {}).content);
    const outcome = outcomeFor(userText);
    const tools = (p.tools || []).filter((tool) => { return tool && tool.type === 'function' && tool.name; });
    const tool = chooseTool(tools, p.tool_choice, roleOf(last), userText, (t) => { return t.name; });
    const message = (status, content) => { return { id: `msg_${hex(48)}`, type: 'message', status, content, role: 'assistant' }; };

    if (outcome === 'refuse') { return { status: 'completed', output: [message('completed', [{ type: 'refusal', refusal: REFUSAL }])] }; }
    if (tool && outcome !== 'length') {
        return {
            status: 'completed',
            output: [{
                id: `fc_${hex(48)}`, type: 'function_call', status: 'completed', arguments: JSON.stringify(example(tool.parameters || {}, tool.parameters || {})),
                call_id: `call_${alnum(24)}`, name: tool.name
            }]
        };
    }
    if (outcome === 'content_filter') { return { status: 'incomplete', reason: 'content_filter', output: [] }; }

    const text = replyText(responseFormat(p.text), userText, roleOf(last), last.output === undefined ? textOf(last.content) : String(last.output));
    const cut = outcome === 'length';
    const part = { type: 'output_text', annotations: [], logprobs: [], text: cut ? text.slice(0, Math.ceil(text.length / 2)) : text };

    return { status: cut ? 'incomplete' : 'completed', reason: cut ? 'max_output_tokens' : null, output: [message(cut ? 'incomplete' : 'completed', [part])] };
}

function responseUsage (input, output) {
    return {
        input_tokens: input, input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 },
        output_tokens: output, output_tokens_details: { reasoning_tokens: 0 }, total_tokens: input + output
    };
}

// The response as Responses API events: created, in progress, each output item with its
// deltas, then completed (or incomplete).
function responseStream (response) {
    const events = [];
    const add = (type, fields) => { events.push({ type, sequence_number: events.length, ...fields }); };
    const pending = { ...response, status: 'in_progress', output: [], usage: null, completed_at: null };

    add('response.created', { response: pending });
    add('response.in_progress', { response: pending });
    response.output.forEach((item, outputIndex) => {
        if (item.type === 'function_call') {
            add('response.output_item.added', { output_index: outputIndex, item: { ...item, status: 'in_progress', arguments: '' } });
            for (const piece of pieces(item.arguments, 12)) { add('response.function_call_arguments.delta', { item_id: item.id, output_index: outputIndex, delta: piece }); }
            add('response.function_call_arguments.done', { item_id: item.id, output_index: outputIndex, name: item.name, arguments: item.arguments });
        }
        else {
            add('response.output_item.added', { output_index: outputIndex, item: { ...item, status: 'in_progress', content: [] } });
            item.content.forEach((part, contentIndex) => {
                const where = { item_id: item.id, output_index: outputIndex, content_index: contentIndex };
                const refusal = part.type === 'refusal';
                const text = refusal ? part.refusal : part.text;

                add('response.content_part.added', { ...where, part: refusal ? { type: 'refusal', refusal: '' } : { ...part, text: '' } });
                for (const piece of pieces(text)) {
                    add(refusal ? 'response.refusal.delta' : 'response.output_text.delta', { ...where, delta: piece, ...(refusal ? {} : { logprobs: [] }) });
                }
                add(refusal ? 'response.refusal.done' : 'response.output_text.done', { ...where, ...(refusal ? { refusal: text } : { text, logprobs: [] }) });
                add('response.content_part.done', { ...where, part });
            });
        }
        add('response.output_item.done', { output_index: outputIndex, item });
    });
    add(response.status === 'incomplete' ? 'response.incomplete' : 'response.completed', { response });

    return events.map((event) => { return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`; }).join('');
}

route('POST', '/v1/responses', async (ctx) => {
    const p = ctx.params;

    if (!p.prompt) { requireModel(p, ['text', 'responses']); }
    if (p.input === undefined && !p.previous_response_id && !p.prompt) { throw fail('missingParameter', { name: 'input' }, { param: 'input' }); }

    // A previous response's conversation comes first, as if it had been sent again.
    let history = [];

    if (p.previous_response_id) {
        const previous = await store.get('response', p.previous_response_id);

        if (!previous) { throw fail('previousResponse', { id: p.previous_response_id }, { param: 'previous_response_id' }); }
        history = [...previous._items, ...previous.output];
    }

    const items = [...history, ...inputItems(p.input)];
    const inputTokens = items.reduce((n, item) => { return n + tokens(textOf(item.content) || item.output || item.arguments); }, 0) + tokens(p.instructions);

    checkContext(textOf((items.filter((item) => { return roleOf(item) === 'user'; }).pop() || {}).content), inputTokens, 'input');

    const { status, reason, output } = responseOutput(p, items);
    const created = now();
    const response = {
        id: `resp_${hex(48)}`,
        object: 'response',
        created_at: created,
        status,
        background: false,
        completed_at: status === 'completed' ? created : null,
        error: null,
        incomplete_details: reason ? { reason } : null,
        instructions: p.instructions === undefined ? null : p.instructions,
        max_output_tokens: p.max_output_tokens === undefined ? null : p.max_output_tokens,
        max_tool_calls: p.max_tool_calls === undefined ? null : p.max_tool_calls,
        model: p.model || null,
        output,
        parallel_tool_calls: p.parallel_tool_calls !== false,
        previous_response_id: p.previous_response_id || null,
        prompt_cache_key: p.prompt_cache_key || null,
        reasoning: { effort: (p.reasoning && p.reasoning.effort) || null, summary: null },
        safety_identifier: p.safety_identifier || null,
        service_tier: p.service_tier || 'default',
        store: p.store !== false,
        temperature: p.temperature === undefined ? 1 : p.temperature,
        text: { format: (p.text && p.text.format) || { type: 'text' }, verbosity: (p.text && p.text.verbosity) || 'medium' },
        tool_choice: p.tool_choice === undefined ? 'auto' : p.tool_choice,
        tools: p.tools || [],
        top_logprobs: p.top_logprobs || 0,
        top_p: p.top_p === undefined ? 1 : p.top_p,
        truncation: p.truncation || 'disabled',
        usage: responseUsage(inputTokens, output.reduce((n, item) => { return n + tokens(JSON.stringify(item.content || item.arguments)); }, 0)),
        user: p.user || null,
        metadata: p.metadata || {},
        access_programs: null
    };

    // Stored by default, so it can be read back and continued with previous_response_id.
    if (response.store) { await store.save({ ...response, _items: items }, 'response'); }

    return p.stream === true ? reply(200, responseStream(response), SSE) : response;
});

async function loadResponse (id) {
    const response = await store.get('response', id);

    if (!response) { throw fail('notFound', { kind: 'response', id }); }

    return response;
}

route('GET', '/v1/responses/:response_id', async (ctx, id) => { return view(await loadResponse(id)); });

route('DELETE', '/v1/responses/:response_id', async (ctx, id) => {
    await loadResponse(id);
    await store.remove('response', id);

    return { id, object: 'response.deleted', deleted: true };
});

// ─── Embeddings ───

// A unit vector derived from the model and input: the same text always gets the same vector.
function embedding (model, input, size) {
    const seed = `${model}:${typeof input === 'string' ? input : JSON.stringify(input)}`;
    const values = [];

    for (let counter = 0; values.length < size; counter++) {
        const block = createHash('sha256').update(`${seed}:${counter}`).digest();

        for (let i = 0; i + 1 < block.length && values.length < size; i += 2) { values.push(block.readUInt16LE(i) / 32767.5 - 1); }
    }

    const norm = Math.sqrt(values.reduce((sum, v) => { return sum + v * v; }, 0));

    return values.map((v) => { return Number((v / norm).toFixed(8)); });
}

route('POST', '/v1/embeddings', (ctx) => {
    const p = ctx.params;

    requireModel(p, ['embedding']);
    if (p.input === undefined) { throw fail('missingParameter', { name: 'input' }, { param: 'input' }); }

    // A string, a list of strings, a list of tokens, or a list of token lists.
    const inputs = Array.isArray(p.input) ? (typeof p.input[0] === 'number' ? [p.input] : p.input) : [p.input];
    const format = p.encoding_format || 'float';
    let size = EMBEDDING_DIMENSIONS[p.model] || 1536;

    if (!inputs.length) { throw fail('emptyArray', { name: 'input' }, { param: 'input' }); }
    if (!['float', 'base64'].includes(format)) { throw fail('invalidValue', { value: format, supported: '\'float\' and \'base64\'' }, { param: 'encoding_format' }); }
    if (p.dimensions !== undefined) {
        if (p.model === 'text-embedding-ada-002') { throw fail('dimensions', {}, { param: 'dimensions' }); }
        size = Number(p.dimensions);
    }

    const data = inputs.map((input, index) => {
        const vector = embedding(p.model, input, size);

        return { object: 'embedding', index, embedding: format === 'base64' ? Buffer.from(new Float32Array(vector).buffer).toString('base64') : vector };
    });
    const promptTokens = inputs.reduce((n, input) => { return n + (Array.isArray(input) ? input.length : tokens(input)); }, 0);

    return { object: 'list', data, model: p.model, usage: { prompt_tokens: promptTokens, total_tokens: promptTokens } };
});

// ─── Moderations ───

// `[mock:flagged]` in the input flags it for harassment; `[mock:flagged:<category>]` for that category.
function moderate (input) {
    const text = typeof input === 'string' ? input : Array.isArray(input) ? input.map((part) => { return (part && part.text) || ''; }).join(' ') : '';
    const types = Array.isArray(input) && input.some((part) => { return part && part.type === 'image_url'; }) ? ['text', 'image'] : ['text'];
    const marker = text.match(/\[mock:flagged(?::([\w/-]+))?\]/);
    const category = marker ? (SPEC.moderationCategories.includes(marker[1]) ? marker[1] : 'harassment') : null;
    const each = (value) => { return Object.fromEntries(SPEC.moderationCategories.map((c) => { return [c, value(c)]; })); };

    return {
        flagged: Boolean(category),
        categories: each((c) => { return c === category; }),
        category_scores: each((c) => { return c === category ? 0.97 : 0.0001; }),
        category_applied_input_types: each(() => { return types; })
    };
}

route('POST', '/v1/moderations', (ctx) => {
    const p = ctx.params;
    const model = p.model || 'omni-moderation-latest';

    if (p.input === undefined) { throw fail('missingParameter', { name: 'input' }, { param: 'input' }); }
    if (!SPEC.models.moderation.includes(model)) { throw fail('modelNotFound', { model }); }

    // A list of strings is moderated one by one; a list of parts (text and images) as one input.
    const inputs = Array.isArray(p.input) && p.input.every((item) => { return typeof item === 'string'; }) ? p.input : [p.input];

    return { id: `modr-${hex(32)}`, model, results: inputs.map(moderate) };
});

// ─── Models ───

const modelView = (id) => { return { id, object: 'model', created: MODEL_CREATED, owned_by: id.startsWith('ft:') ? 'user' : 'system' }; };

route('GET', '/v1/models', () => { return { object: 'list', data: allModels().map(modelView) }; });

route('GET', '/v1/models/:model', (ctx, id) => {
    if (!isKnown(id, ['text', 'responses', 'embedding', 'moderation'])) { throw fail('modelNotFound', { model: id }, { param: 'model' }); }

    return modelView(id);
});

// ─── Auth ───

// OpenAI masks a wrong key in its error: the first three characters and the last four.
const masked = (key) => { return key.length > 8 ? `${key.slice(0, 3)}${'*'.repeat(key.length - 7)}${key.slice(-4)}` : key; };

// Any key starting with `sk-` works, and so does none: a deployed mock server strips the
// caller's Authorization header (or shows it as `[redacted]`), so there is nothing to check.
function authenticate (req) {
    const header = req.headers.authorization;

    if (!header || /redacted/i.test(header)) { return; }

    const [scheme, key = ''] = header.split(' ');

    if (scheme !== 'Bearer' || !/^sk-/.test(key)) { throw fail('invalidApiKey', { key: masked(key || header) }); }
}

// ─── Hooks the runtime calls ───

provider({
    // Extra per-request context: the request's id.
    context () { return { requestId: `req_${hex(32)}` }; },

    authenticate,

    // Scenarios that fail every request (rate-limited, insufficient-quota, server-error, overloaded).
    beforeRoute () {
        if (SCENARIO.failAll) {
            throw fail(SCENARIO.failAll, { model: SPEC.models.text[0] }, { headers: SCENARIO.failAll === 'rateLimited' ? RATE_LIMIT_HEADERS : undefined });
        }
    },

    unrecognized (req, url) { return fail('invalidUrl', { method: req.method, path: url.pathname }); },
    invalidBody () { return fail('invalidJson'); },
    missingSession (message) { return fail('missingSession', { message }); },
    unknownParameter (name) { return fail('unknownParameter', { name }); },
    internalError (error) { return { error: { message: `Mock error: ${error.message}`, type: 'server_error', param: null, code: null } }; },

    responseHeaders (ctx) {
        return {
            'x-request-id': ctx.requestId,
            'openai-version': '2020-10-01',
            'openai-organization': 'org-mock',
            'openai-processing-ms': '42',
            'x-ratelimit-limit-requests': '10000',
            'x-ratelimit-remaining-requests': '9999',
            'x-ratelimit-reset-requests': '6ms'
        };
    }
});

// ═══ RUNTIME ═════════════════════════════════════════════════════════════════════════════════════
/* global SCENARIO, SPEC, META, pm, renderDocs */
// The runtime: routing, state, request parsing, idempotency, the docs page and the server,
// the same for every API. The API section above registers its routes with route() and its
// hooks with provider(). Both are function declarations, so they work before this code runs.

const http = require('http');
const crypto = require('crypto');
const NodeBuffer = require('buffer').Buffer;

const PORT = process.env.PORT || 4609;

// What a hosted mock answers to an API request without x-mock-session, in the provider's error format.
const MISSING_SESSION = 'This hosted mock needs an x-mock-session header on every API request: send an id of ' +
    'your own, such as a random UUID. Each id gets its own data. The docs are at /.';

// ─── Routes and provider hooks ───

// `:name` matches one path segment; `:name*` the rest of the path, slashes included (an S3 key).
function route (method, path, handler) {
    route.table = route.table || [];
    route.table.push({ method, path, pattern: new RegExp(`^${path.replace(/:\w+\*/g, '(.+)').replace(/:\w+/g, '([^/]+)')}$`), handler });
}

function provider (hooks) {
    provider.hooks = hooks;
}

// An error the provider throws to answer with its own status and body (and `headers`, if any).
function isApiError (error) {
    return Boolean(error) && Number.isInteger(error.status) && error.body !== undefined;
}

// A handler returns its result for a 200 with a JSON body, or reply() for anything else:
// `return reply(202, undefined, { 'X-Message-Id': id })` answers 202 with no body.
function reply (status, body, headers = {}) {
    return { isReply: true, status, body, headers };
}

// ─── State (pm.state, shared by every scenario) ───

// Entities are kept by kind and id. The kind defaults to the entity's `object` field (as on
// Stripe); a provider whose objects have no such field passes the kind.
const store = {
    get (kind, id) {
        return pm.state.get(`${kind}:${id}`);
    },

    async save (entity, kind = entity.object) {
        if (entity._seq === undefined) { entity._seq = await pm.state.increment('seq'); }
        await pm.state.set(`${kind}:${entity.id}`, entity);

        return entity;
    },

    remove (kind, id) {
        return pm.state.delete(`${kind}:${id}`);
    },

    // Newest first.
    async all (kind) {
        const prefix = `${kind}:`,
            entities = [];

        for (const key of await pm.state.keys()) {
            if (key.startsWith(prefix)) { entities.push(await pm.state.get(key)); }
        }

        return entities.filter(Boolean).sort((a, b) => { return b._seq - a._seq; });
    }
};

function randomId (prefix, length = 24) {
    return `${prefix}_${crypto.randomBytes(length).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, length)}`;
}

function now () {
    return Math.floor(Date.now() / 1000);
}

// The fields of a stored object a response shows (internal ones start with `_`).
function view (entity) {
    return Object.fromEntries(Object.entries(entity).filter(([key]) => { return !key.startsWith('_'); }));
}

// ─── Requests ───

// Form bodies and query strings, with brackets: `metadata[order]=1`, `expand[]=x`, `items[0][price]=y`.
function parseParams (text) {
    const params = {};
    const decode = (value) => { return decodeURIComponent(value.replace(/\+/g, ' ')); };

    for (const pair of text.split('&')) {
        if (!pair) { continue; }

        const [rawKey, rawValue = ''] = pair.split(/=(.*)/s);
        const path = decode(rawKey).replace(/\]/g, '').split('[');
        let node = params;

        path.forEach((segment, index) => {
            const slot = segment === '' && Array.isArray(node) ? node.length : segment;

            if (index === path.length - 1) {
                node[slot] = decode(rawValue);

                return;
            }
            if (node[slot] === undefined) { node[slot] = /^\d*$/.test(path[index + 1]) ? [] : {}; }
            node = node[slot];
        });
    }

    return params;
}

// Form values arrive as strings: type them as the spec declares, leaving metadata as strings.
function coerce (params, types) {
    const nested = (node) => {
        for (const [key, value] of Object.entries(node)) {
            if (value === 'true' || value === 'false') { node[key] = value === 'true'; }
            else if (value && typeof value === 'object') { nested(value); }
        }
    };

    for (const [key, value] of Object.entries(params)) {
        if (types[key] === 'integer' && /^-?\d+$/.test(value)) { params[key] = Number(value); }
        else if (types[key] === 'boolean' && (value === 'true' || value === 'false')) { params[key] = value === 'true'; }
        else if (key !== 'metadata' && value && typeof value === 'object') { nested(value); }
    }

    return params;
}

// The handler reads the raw stream as bytes: `req.body` from the runtime is a lossy UTF-8 copy.
function readBody (req) {
    return new Promise((resolve, reject) => {
        const chunks = [];

        req.on('data', (chunk) => { chunks.push(NodeBuffer.from(chunk)); });
        req.on('end', () => { resolve(NodeBuffer.concat(chunks)); });
        req.on('error', reject);
    });
}

function parseRequest (req, raw, types) {
    if ((req.headers['content-type'] || '').includes('application/json') && raw) {
        try { return JSON.parse(raw); }
        catch (error) { throw provider.hooks.invalidBody(); }
    }

    return coerce(parseParams(raw), types);
}

// ─── Idempotency ───

// The first response to a repeated key is replayed for the window; the same key with a
// different request is a conflict. Rate limits and server errors are not saved, so a retry runs again.
async function idempotent (ctx, fingerprint, run) {
    const { windowMs } = provider.hooks.idempotency;
    const key = `idempotency:${ctx.idempotencyKey}`;
    const saved = await pm.state.get(key);

    if (saved && Date.now() - saved.at < windowMs) {
        if (saved.fingerprint !== fingerprint) { throw provider.hooks.idempotencyConflict(ctx.idempotencyKey); }

        return { ...saved.response, replayed: true };
    }

    const response = await run();

    if (response.status < 500 && response.status !== 429) {
        await pm.state.set(key, { at: Date.now(), fingerprint, response });
    }

    return response;
}

// ─── Docs at `/` ───

// A browser (Accept: text/html) gets the docs page; anything else at `/` gets the JSON
// descriptor, and `/llms.txt` the plain-text summary. API paths are never shadowed: when the
// API itself answers `GET /` (S3's ListBuckets), `/` is the docs page for browsers only, and
// the descriptor is at `/docs`.
function docsResponse (req, url) {
    if (req.method !== 'GET' || !['/', '/docs', '/llms.txt'].includes(url.pathname)) { return null; }

    const html = (req.headers.accept || '').includes('text/html');
    const apiRoot = (route.table || []).some((candidate) => { return candidate.method === 'GET' && candidate.pattern.test('/'); });

    if (url.pathname === '/' && apiRoot && !html) { return null; }

    // Behind the hosted gateway, Host is an internal address; x-mock-host is the public one.
    const host = req.headers['x-mock-host'] || req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
    const local = /^(localhost|127\.0\.0\.1)(:|$)/.test(host);
    const base = `${req.headers['x-forwarded-proto'] || (local ? 'http' : 'https')}://${host}`;
    const docs = renderDocs({ base, host, scenario: SCENARIO.name, local });

    if (url.pathname === '/llms.txt') { return { status: 200, type: 'text/plain; charset=utf-8', body: docs.llms }; }

    return html ?
        { status: 200, type: 'text/html; charset=utf-8', body: docs.html } :
        { status: 200, type: 'application/json', body: JSON.stringify(docs.descriptor, null, 2) };
}

// ─── Dispatch ───

async function respond (req, ctx) {
    const hooks = provider.hooks;
    const url = new URL(req.url || '/', 'http://localhost');
    // A provider can route on another path than the request's: S3 moves a bucket named in the Host to the path.
    const pathname = hooks.rewrite ? hooks.rewrite(req, url) : url.pathname;
    const docs = pathname === url.pathname && docsResponse(req, url);

    if (docs) { return docs; }

    // A hosted mock is shared by everyone who calls its URL, so each caller names their own
    // state with x-mock-session; without one, every caller would share a single pool. The
    // gateway sets x-mock-host; a mock run locally has one caller and needs no session.
    if (req.headers['x-mock-host'] && !req.headers['x-mock-session']) { throw hooks.missingSession(MISSING_SESSION); }

    hooks.authenticate(req);
    if (hooks.beforeRoute) { await hooks.beforeRoute(ctx); }

    const match = (route.table || []).map((candidate) => {
        return candidate.method === req.method && { candidate, args: candidate.pattern.exec(pathname) };
    }).find((found) => { return found && found.args; });

    if (!match) { throw hooks.unrecognized(req, url); }

    // Which route answered, as `METHOD /path` (the provider's own spelling), for errors that name it.
    ctx.route = `${match.candidate.method} ${match.candidate.path}`;

    // A route the spec doesn't describe (one added by hand) skips the unknown-parameter check.
    const known = SPEC.params[`${match.candidate.method} ${match.candidate.path}`];
    const query = url.search.slice(1);
    ctx.body = ['GET', 'HEAD'].includes(req.method) ? NodeBuffer.alloc(0) : await readBody(req);
    // The parameters are the body's, or the query string's when there is no body.
    const raw = ctx.body.length ? ctx.body.toString('utf8') : query;
    const run = async () => {
        try {
            // A provider whose bodies aren't JSON or form data (XML, a file) parses them itself.
            ctx.params = hooks.parseBody ? hooks.parseBody(req, ctx.body) : parseRequest(req, raw, known || {});
            ctx.query = ctx.body.length || hooks.parseBody ? parseParams(query) : ctx.params;

            // A provider that ignores unknown parameters leaves out the unknownParameter hook.
            const named = ctx.params && typeof ctx.params === 'object' && !Array.isArray(ctx.params);
            const unknown = known && named && hooks.unknownParameter && Object.keys(ctx.params).find((name) => { return !(name in known); });

            if (unknown) { throw hooks.unknownParameter(unknown); }

            const result = await match.candidate.handler(ctx, ...match.args.slice(1).map(decodeURIComponent));
            const answer = result && result.isReply ? result : { status: 200, body: result, headers: {} };

            return {
                ...answer,
                body: hooks.render && answer.body !== undefined ? await hooks.render(ctx, answer.body) : answer.body
            };
        }
        catch (error) {
            if (isApiError(error)) { return { status: error.status, body: error.body, headers: error.headers || {} }; }
            throw error;
        }
    };

    if (req.method === 'POST' && ctx.idempotencyKey) {
        return idempotent(ctx, crypto.createHash('sha256').update(`${req.method} ${url.pathname} ${raw}`).digest('hex'), run);
    }

    return run();
}

// A JSON body; none when the handler replied without one (a 202 or 204); or, when the reply
// gives its own Content-Type, a string or bytes as they are (a text/event-stream, XML, a file).
function send (res, ctx, { status, body, headers = {}, replayed, type }) {
    if (type) {
        res.writeHead(status, { 'Content-Type': type });
        res.end(body);

        return;
    }
    const raw = (typeof body === 'string' || NodeBuffer.isBuffer(body)) && Object.keys(headers).some((name) => { return name.toLowerCase() === 'content-type'; });

    res.writeHead(status, {
        ...(body === undefined || raw ? {} : { 'Content-Type': 'application/json' }),
        ...(provider.hooks.responseHeaders ? provider.hooks.responseHeaders(ctx) : {}),
        ...headers,
        ...(ctx.idempotencyKey ? { 'Idempotency-Key': ctx.idempotencyKey } : {}),
        ...(replayed ? { 'Idempotent-Replayed': 'true' } : {})
    });
    res.end(body === undefined || raw ? body : JSON.stringify(body));
}

function start () {
    const hooks = provider.hooks;

    http.createServer((req, res) => {
        const idempotencyHeader = hooks.idempotency && hooks.idempotency.header;
        const ctx = {
            idempotencyKey: (idempotencyHeader && req.headers[idempotencyHeader]) || null,
            params: {},
            query: {},
            body: NodeBuffer.alloc(0),
            ...(hooks.context ? hooks.context(req) : {})
        };

        respond(req, ctx)
            .catch((error) => {
                // internalError returns the body of a 500, or an error of the provider's own (with its headers).
                const failure = isApiError(error) ? error : hooks.internalError(error);

                return isApiError(failure) ? { status: failure.status, body: failure.body, headers: failure.headers || {} } :
                    { status: 500, body: failure };
            })
            .then((response) => { send(res, ctx, response); });
    }).listen(PORT);
}

/* global META */
// ─── Docs at `/`: the page, the JSON descriptor and llms.txt, rendered from META ───
//
// META (bottom of the file) holds the provider's profile, the scenarios and the routes.
// {{BASE_URL}}, {{HOST}} and {{SCENARIO}} are filled in per request.

const escape = (text) => {
    return String(text).replace(/[&<>"]/g, (c) => { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
};

// Aether icons: icon-action-copy-stroke and icon-state-check-stroke (20x20), recoloured with currentColor.
const ICON_COPY = [
    '<svg class="icon-copy" width="16" height="16" viewBox="0 0 20 20" aria-hidden="true"><path fill=',
    '"currentColor" d="M13.7998 16V17H9.2002V16H13.7998ZM16 13.7998V9.2002C16 8.62364 15.9987 8.25111',
    ' 15.9756 7.96777C15.9534 7.69619 15.9158 7.59534 15.8906 7.5459C15.7948 7.35793 15.6421 7.20521 ',
    '15.4541 7.10938C15.4047 7.08419 15.3038 7.04661 15.0322 7.02441C14.7489 7.00126 14.3764 7 13.799',
    '8 7H9.2002C8.62364 7 8.25111 7.00126 7.96777 7.02441C7.69619 7.04661 7.59534 7.08419 7.5459 7.10',
    '938C7.35793 7.20521 7.20521 7.35793 7.10938 7.5459C7.08419 7.59534 7.04661 7.69619 7.02441 7.967',
    '77C7.00126 8.25111 7 8.62364 7 9.2002V13.7998C7 14.3764 7.00126 14.7489 7.02441 15.0322C7.04661 ',
    '15.3038 7.08419 15.4047 7.10938 15.4541C7.20521 15.6421 7.35793 15.7948 7.5459 15.8906C7.59534 1',
    '5.9158 7.69619 15.9534 7.96777 15.9756C8.25111 15.9987 8.62364 16 9.2002 16V17L8.45801 16.9971C7',
    '.91644 16.9886 7.55193 16.9578 7.25977 16.8535L7.0918 16.7822C6.76256 16.6145 6.48707 16.3592 6.',
    '29492 16.0459L6.21777 15.9082C5.99979 15.4804 6 14.9199 6 13.7998V9.2002C6 8.08009 5.99979 7.519',
    '62 6.21777 7.0918C6.40951 6.71554 6.71554 6.40951 7.0918 6.21777C7.41263 6.0543 7.80803 6.01315 ',
    '8.45801 6.00293L9.2002 6H13.7998C14.9199 6 15.4804 5.99979 15.9082 6.21777C16.2845 6.40951 16.59',
    '05 6.71554 16.7822 7.0918C17.0002 7.51962 17 8.08009 17 9.2002V13.7998C17 14.9199 17.0002 15.480',
    '4 16.7822 15.9082L16.7051 16.0459C16.5129 16.3592 16.2374 16.6145 15.9082 16.7822L15.7402 16.853',
    '5C15.3311 16.9995 14.7798 17 13.7998 17V16C14.3764 16 14.7489 15.9987 15.0322 15.9756C15.3038 15',
    '.9534 15.4047 15.9158 15.4541 15.8906C15.6421 15.7948 15.7948 15.6421 15.8906 15.4541C15.9158 15',
    '.4047 15.9534 15.3038 15.9756 15.0322C15.9987 14.7489 16 14.3764 16 13.7998Z"/><path fill="curre',
    'ntColor" d="M10.9902 4.39941C10.9437 4.17145 10.7417 4 10.5 4H5C4.44772 4 4 4.44772 4 5V10.5C4 1',
    '0.7417 4.17145 10.9437 4.39941 10.9902L4.60059 11.0098C4.82855 11.0563 5 11.2583 5 11.5C5 11.776',
    '1 4.77614 12 4.5 12C3.67157 12 3 11.3284 3 10.5V5C3 3.89543 3.89543 3 5 3H10.5C11.3284 3 12 3.67',
    '157 12 4.5C12 4.77614 11.7761 5 11.5 5C11.2583 5 11.0563 4.82855 11.0098 4.60059L10.9902 4.39941',
    'Z"/></svg>'
].join('');
const ICON_CHECK = [
    '<svg class="icon-check" width="16" height="16" viewBox="0 0 20 20" aria-hidden="true"><path fill',
    '="currentColor" d="M15.5918 3.71094C15.7514 3.48562 16.0637 3.43224 16.289 3.5918C16.5143 3.7514',
    '1 16.5677 4.06373 16.4082 4.28907L7.90817 16.2891C7.82301 16.4093 7.68875 16.4856 7.54195 16.498',
    '1C7.39523 16.5104 7.25057 16.4576 7.14645 16.3535L2.64645 11.8535C2.45118 11.6583 2.45118 11.341',
    '8 2.64645 11.1465C2.84171 10.9512 3.15822 10.9512 3.35348 11.1465L7.43356 15.2266L15.5918 3.7109',
    '4Z"/></svg>'
].join('');

const copyButton = (label) => {
    return `<button class="copy" type="button" aria-label="Copy ${escape(label)}" title="Copy">${ICON_COPY}${ICON_CHECK}</button>`;
};

// A code block with its copy button.
const codeBlock = (label, code) => {
    return `<div class="code"><div class="code-head"><span>${escape(label)}</span>${copyButton(label)}</div><pre>${escape(code)}</pre></div>`;
};

const METHOD_CLASS = { GET: 'm-get', HEAD: 'm-get', POST: 'm-post', PUT: 'm-put', PATCH: 'm-put', DELETE: 'm-delete' };

// Endpoints grouped by resource: the group the mock gives an endpoint, or the
// first path segment after the version (`/v1/payment_intents/...` -> payment_intents).
function groupRoutes (routes) {
    const groups = new Map();

    for (const route of routes) {
        const segments = route.path.split('/').filter(Boolean);
        const resource = route.group || (/^v\d/.test(segments[0]) ? segments[1] : segments[0]) || '/';

        if (!groups.has(resource)) { groups.set(resource, []); }
        groups.get(resource).push(route);
    }

    return [...groups.entries()];
}

function docsPage ({ manifest, profile, scenarios, routes, apiVersion, local }) {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(manifest.name)} mock · Postman</title>
<meta name="description" content="${escape(profile.summary)}">
<link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
  /* Aether design tokens: light theme */
  :root {
    --base-color-brand: #FF6C37;
    --content-color-primary: #212121;
    --content-color-secondary: #6B6B6B;
    --content-color-tertiary: #A6A6A6;
    --content-color-brand: #D03E0A;
    --content-color-success: #247E4C;
    --content-color-warning: #A87D13;
    --content-color-error: #9F2F22;
    --content-color-info: #2552AA;
    --content-color-link: #2F67CC;
    --background-color-primary: #FFFFFF;
    --background-color-secondary: #F9F9F9;
    --background-color-tertiary: #F2F2F2;
    --background-color-brand: #FFF0EA;
    --border-color-default: #EDEDED;
    --border-color-strong: #E6E6E6;
    --header-background-color-primary: #212121;
    --header-color-content: #A6A6A6;
    --highlight-background-color-primary: #EDEDED;
    --shadow-focus: 0 0 0 1px #FFFFFF, 0 0 0 3px #9FC0FA;
    --text-family-default: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    --text-family-code: 'IBM Plex Mono', SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    color-scheme: light;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--background-color-primary); color: var(--content-color-primary);
    font: 400 13px/20px var(--text-family-default); }
  a { color: var(--content-color-link); text-decoration: none; }
  a:hover { text-decoration: underline; }
  header { background: var(--header-background-color-primary); color: var(--header-color-content); }
  header div { max-width: 880px; margin: 0 auto; padding: 0 16px; height: 48px; display: flex; align-items: center; gap: 8px; }
  /* Aether's icon-brandLogo-postman. */
  .logo { width: 20px; height: 20px; flex: none; }
  header b { color: #FFFFFF; font-weight: 600; }
  /* "Open in Postman", at the header's right. */
  .open { margin-left: auto; background: #FF6C37; color: #FFFFFF; font-weight: 600; white-space: nowrap; padding: 4px 12px; border-radius: 4px; }
  .open:hover { text-decoration: none; filter: brightness(1.08); }
  @media (max-width: 560px) { header span { display: none; } }
  /* One column no wider than the screen: a wide code block scrolls inside its box instead of widening the page. */
  main { max-width: 880px; margin: 0 auto; padding: 32px 16px 48px; display: grid; grid-template-columns: minmax(0, 1fr); gap: 32px; }
  h1 { margin: 0; font-size: 21px; line-height: 32px; font-weight: 600; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  h2 { margin: 0; font-size: 15px; line-height: 24px; font-weight: 600; }
  h3 { margin: 0; font-size: 12px; line-height: 16px; font-weight: 600; color: var(--content-color-secondary); text-transform: uppercase; letter-spacing: .04em; }
  p { margin: 0; }
  .secondary { color: var(--content-color-secondary); }
  .facts { display: grid; grid-template-columns: max-content 1fr; gap: 6px 20px; margin: 4px 0 0; }
  .facts dt { color: var(--content-color-secondary); }
  .facts dd { margin: 0; min-width: 0; }
  .facts code { white-space: nowrap; }
  @media (max-width: 560px) { .facts { grid-template-columns: 1fr; gap: 2px; } .facts dd { margin-bottom: 8px; } }
  .meta { display: flex; flex-wrap: wrap; gap: 4px 16px; color: var(--content-color-secondary); font-size: 12px; }
  .badge { font-size: 11px; line-height: 16px; font-weight: 600; padding: 2px 6px; border-radius: 4px;
    background: var(--background-color-brand); color: var(--content-color-brand); }
  section { display: grid; gap: 8px; min-width: 0; }
  code { font: 12px/16px var(--text-family-code); background: var(--background-color-tertiary); padding: 2px 4px; border-radius: 4px; }
  .copy { width: 28px; height: 28px; display: inline-grid; place-items: center; flex: none; border: 0; border-radius: 4px;
    background: transparent; color: var(--content-color-secondary); cursor: pointer; }
  .copy:hover { background: var(--highlight-background-color-primary); color: var(--content-color-primary); }
  .copy:focus-visible { outline: none; box-shadow: var(--shadow-focus); }
  .copy .icon-check, .copy.copied .icon-copy { display: none; }
  .copy.copied .icon-check { display: block; color: var(--content-color-success); }
  .field { display: flex; align-items: center; gap: 4px; height: 36px; padding: 0 4px 0 12px;
    background: var(--background-color-secondary); border: 1px solid var(--border-color-strong); border-radius: 4px; }
  .field span { flex: 1; min-width: 0; font: 13px var(--text-family-code); overflow-wrap: anywhere; }
  .code { border: 1px solid var(--border-color-default); border-radius: 4px; overflow: hidden; min-width: 0; }
  .code-head { display: flex; align-items: center; justify-content: space-between; height: 32px; padding: 0 4px 0 12px;
    background: var(--background-color-secondary); border-bottom: 1px solid var(--border-color-default);
    font-size: 12px; font-weight: 500; color: var(--content-color-secondary); }
  pre { margin: 0; font: 12px/20px var(--text-family-code); padding: 12px; overflow-x: auto; }
  .stack { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; }
  .table { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 12px; font-weight: 500; color: var(--content-color-secondary);
    padding: 6px 8px; border-bottom: 1px solid var(--border-color-strong); }
  td { padding: 8px; border-bottom: 1px solid var(--border-color-default); vertical-align: top; }
  td:first-child { width: 45%; }
  tr.current td { background: var(--background-color-secondary); }
  .now { margin-left: 8px; font-size: 11px; color: var(--content-color-secondary); }
  .tone-success { color: var(--content-color-success); }
  .tone-warning { color: var(--content-color-warning); }
  .tone-error { color: var(--content-color-error); }
  .groups { display: grid; gap: 20px; }
  .group { display: grid; gap: 4px; min-width: 0; overflow-x: auto; }
  h3 { text-transform: none; letter-spacing: 0; font-size: 13px; color: var(--content-color-primary); }
  .endpoints td { padding: 6px 8px; }
  .endpoints td.method { width: 64px; padding-left: 0; font: 500 12px/20px var(--text-family-code); }
  .endpoints td.path { width: 46%; font: 12px/20px var(--text-family-code); overflow-wrap: anywhere; }
  .endpoints td.summary { color: var(--content-color-secondary); }
  .sources td:first-child { width: 220px; }
  .m-get { color: var(--content-color-success); }
  .m-post { color: var(--content-color-warning); }
  .m-put { color: var(--content-color-info); }
  .m-delete { color: var(--content-color-error); }
  .sources { display: grid; gap: 4px; padding: 0; margin: 0; list-style: none; }
  footer { border-top: 1px solid var(--border-color-default); padding-top: 16px; display: flex; flex-wrap: wrap; gap: 4px 16px;
    font-size: 12px; color: var(--content-color-secondary); }
</style>
</head>
<body>
<header><div><svg class="logo" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M9.01896 0.0651652C7.44955 -0.136374 5.85563 0.132009 4.43876 0.836374C3.02189 1.54074 1.84572 2.64945 1.05898 4.02229C0.272243 5.39513 -0.089721 6.97044 0.0188639 8.549C0.127449 10.1276 0.701705 11.6385 1.66901 12.8907C2.63632 14.1428 3.95322 15.0801 5.45319 15.5838C6.95316 16.0875 8.56882 16.1351 10.0958 15.7206C11.6229 15.306 12.9927 14.448 14.032 13.2549C15.0714 12.0619 15.7336 10.5874 15.9349 9.01796C16.2049 6.91365 15.6279 4.78828 14.331 3.10934C13.034 1.4304 11.1232 0.33539 9.01896 0.0651652Z" fill="white"/><path d="M9.01896 0.0651652C7.44955 -0.136374 5.85563 0.132009 4.43876 0.836374C3.02189 1.54074 1.84572 2.64945 1.05898 4.02229C0.272243 5.39513 -0.089721 6.97044 0.0188639 8.549C0.127449 10.1276 0.701705 11.6385 1.66901 12.8907C2.63632 14.1428 3.95322 15.0801 5.45319 15.5838C6.95316 16.0875 8.56882 16.1351 10.0958 15.7206C11.6229 15.306 12.9927 14.448 14.032 13.2549C15.0714 12.0619 15.7336 10.5874 15.9349 9.01796C16.2049 6.91365 15.6279 4.78828 14.331 3.10934C13.034 1.4304 11.1232 0.33539 9.01896 0.0651652Z" fill="#FF6C37"/><path d="M5.78377 8.5056C5.78687 8.51193 5.79207 8.517 5.7985 8.51992C5.80492 8.52283 5.81215 8.52343 5.81897 8.5216L7.09896 8.2456L6.56056 7.7L5.79337 8.4672C5.78731 8.47128 5.78298 8.47747 5.7812 8.48456C5.77943 8.49165 5.78034 8.49914 5.78377 8.5056Z" fill="white"/><path d="M11.7774 3.0096C11.599 3.00979 11.4229 3.04997 11.2621 3.12721C11.1013 3.20444 10.9599 3.31676 10.8483 3.45589C10.7366 3.59501 10.6576 3.75741 10.617 3.93111C10.5765 4.10482 10.5754 4.28541 10.6138 4.45959C10.6523 4.63378 10.7293 4.79712 10.8393 4.93759C10.9492 5.07806 11.0893 5.19208 11.2491 5.27126C11.409 5.35043 11.5845 5.39275 11.7629 5.3951C11.9413 5.39744 12.1179 5.35975 12.2798 5.2848L11.4686 4.4736C11.4592 4.46431 11.4519 4.45328 11.4468 4.44113C11.4418 4.42898 11.4392 4.41596 11.4392 4.4028C11.4392 4.38965 11.4418 4.37662 11.4468 4.36448C11.4519 4.35233 11.4592 4.34129 11.4686 4.332L12.5286 3.2728C12.3157 3.10164 12.0505 3.00874 11.7774 3.0096Z" fill="white"/><path d="M12.6741 3.4104L11.6805 4.4L12.4597 5.1792C12.5171 5.13888 12.5707 5.09336 12.6197 5.0432C12.8333 4.8282 12.9576 4.54036 12.9677 4.23749C12.9778 3.93461 12.8729 3.63914 12.6741 3.4104Z" fill="white"/><path d="M10.6862 5.2368H10.6686C10.6479 5.23664 10.6273 5.23852 10.607 5.2424H10.5998C10.5775 5.24721 10.5555 5.25362 10.5342 5.2616L10.5174 5.2696C10.5013 5.27632 10.4857 5.28435 10.471 5.2936L10.4534 5.3048C10.434 5.31816 10.4158 5.33315 10.399 5.3496L7.45256 8.2968L7.81736 8.6616L10.9374 5.9232C10.955 5.90773 10.9711 5.89058 10.9854 5.872L10.999 5.8544C11.0096 5.83878 11.0192 5.82248 11.0278 5.8056C11.0326 5.796 11.0366 5.7864 11.0406 5.7768C11.0459 5.76404 11.0505 5.75094 11.0542 5.7376C11.0542 5.728 11.0598 5.7184 11.0622 5.7088C11.0661 5.68899 11.0688 5.66895 11.0702 5.6488V5.6224C11.0702 5.608 11.0702 5.5936 11.0702 5.5792C11.0702 5.5648 11.0702 5.56 11.0662 5.5504C11.0514 5.4749 11.0145 5.40549 10.9602 5.35095C10.906 5.2964 10.8368 5.25918 10.7614 5.244H10.7462C10.7263 5.24019 10.7063 5.23778 10.6862 5.2368Z" fill="white"/><path d="M6.69817 7.5584L7.30297 8.16L10.2574 5.2056C10.3535 5.11162 10.4788 5.05321 10.6126 5.04C10.0902 4.64 9.52056 4.7448 6.69817 7.5584Z" fill="white"/><path d="M11.1037 6.0384L11.0677 6.0736L7.94775 8.81119L8.47815 9.34079C9.79335 8.0968 10.9605 6.912 11.1037 6.0384Z" fill="white"/><path d="M3.32137 12.452C3.323 12.4577 3.32632 12.4627 3.3309 12.4664C3.33548 12.4701 3.34109 12.4724 3.34697 12.4728L4.70697 12.5664L3.94457 11.804L3.32777 12.42C3.32378 12.4242 3.32105 12.4294 3.31992 12.4351C3.31878 12.4407 3.31929 12.4466 3.32137 12.452Z" fill="white"/><path d="M4.08696 11.6624L4.89096 12.4664C4.9005 12.4766 4.91327 12.4832 4.92711 12.4851C4.94095 12.487 4.95502 12.4841 4.96696 12.4768C4.97942 12.4706 4.98935 12.4603 4.99504 12.4476C5.00073 12.4349 5.00183 12.4206 4.99816 12.4072L4.86296 11.8296C4.8542 11.7922 4.85818 11.7529 4.87427 11.718C4.89035 11.683 4.91762 11.6545 4.95176 11.6368C6.36136 10.9304 7.49815 10.2032 8.33255 9.47679L7.77255 8.91679L6.57256 9.17519L4.08696 11.6624Z" fill="white"/><path d="M7.60055 8.7472L7.29975 8.4464L6.88375 8.8616C6.88076 8.86519 6.87912 8.86972 6.87912 8.8744C6.87912 8.87908 6.88076 8.88361 6.88375 8.8872C6.88569 8.89147 6.88911 8.89488 6.89339 8.89679C6.89766 8.89871 6.90248 8.89899 6.90695 8.8976L7.60055 8.7472Z" fill="white"/><path d="M12.7022 4.0552C12.698 4.04261 12.6913 4.03104 12.6824 4.02128C12.6734 4.01151 12.6625 4.00378 12.6503 3.99858C12.6381 3.99339 12.625 3.99087 12.6117 3.99118C12.5985 3.99149 12.5855 3.99463 12.5736 4.00039C12.5616 4.00615 12.5511 4.0144 12.5426 4.02458C12.5341 4.03475 12.5279 4.04662 12.5244 4.05939C12.5209 4.07216 12.5202 4.08553 12.5223 4.09861C12.5244 4.11168 12.5292 4.12416 12.5366 4.1352C12.5604 4.18331 12.5699 4.23731 12.5638 4.29069C12.5577 4.34406 12.5363 4.39453 12.5022 4.436C12.4909 4.44955 12.4838 4.46601 12.4816 4.48346C12.4793 4.50091 12.4821 4.51863 12.4896 4.53457C12.497 4.5505 12.5089 4.56398 12.5237 4.57344C12.5385 4.5829 12.5558 4.58795 12.5734 4.588C12.5869 4.58785 12.6003 4.58478 12.6126 4.57898C12.6249 4.57318 12.6358 4.5648 12.6446 4.5544C12.7012 4.48556 12.7367 4.40184 12.7469 4.31329C12.7571 4.22474 12.7416 4.13513 12.7022 4.0552Z" fill="#FF6C37"/></svg><b>Postman</b><span>/ API mocks / ${escape(manifest.name)}</span><a class="open" href="{{OPEN_URL}}">Open in Postman</a></div></header>
<main>
  <section>
    <h1>${escape(manifest.name)} <span class="badge">MOCK</span></h1>
    <p class="secondary">${escape(profile.summary)}</p>
    <div class="meta">
      <span>API version ${profile.versionDocs ?
        `<a href="${escape(profile.versionDocs)}" rel="noopener" title="How ${escape(profile.provider)} versions its API"><code>${escape(apiVersion)}</code></a>` :
        `<code>${escape(apiVersion)}</code>`}</span>
      <span>${routes.length} endpoints</span>
      <span>${scenarios.length} scenarios</span>
      <span>Maintained by Postman</span>
    </div>
  </section>

  <section>
    <h2>Base URL</h2>
    <div class="field"><span data-copy>{{BASE_URL}}</span>${copyButton('base URL')}</div>
    <dl class="facts">
      <dt>Stands in for</dt><dd>${manifest.origins.map((host) => { return `<code>${escape(host)}</code>`; }).join(' and ')}</dd>
      <dt>Credentials</dt><dd>${profile.auth}</dd>
      <dt>Session</dt><dd>{{SESSION_NOTE}}</dd>
    </dl>
  </section>

  <section>
    <h2>Run it locally</h2>
    <div class="stack">
      ${codeBlock('Run it', local.run.join('\n'))}
      ${codeBlock('Add it to your project', local.project.join('\n'))}
    </div>
    <p class="secondary">Adding it records the mock in <code>.postman/resources.yaml</code>, so teammates and CI get the same one with <code>postman dependency install</code>.</p>
  </section>

  <section>
    <h2>{{CALL_TITLE}}</h2>
    <div class="stack">${profile.snippets.map((s) => { return codeBlock(s.label, s.code); }).join('')}</div>
  </section>

  <section>
    <h2>Scenarios</h2>
    <p class="secondary">Send the <code>x-mock-scenario</code> header to switch. All scenarios share a session's data. This page is served by <b>{{SCENARIO}}</b>.</p>
    <div class="table"><table>
      <thead><tr><th>Header value</th><th>Behaviour</th></tr></thead>
      <tbody>${scenarios.map((s) => { return `<tr data-scenario="${escape(s.name)}"><td><code>${escape(s.name)}</code></td><td>${escape(s.title)}</td></tr>`; }).join('')}</tbody>
    </table></div>
  </section>

  ${profile.dataSections.map((section) => {
        return `<section>
    <h2>${escape(section.title)}</h2>
    ${section.description ? `<p class="secondary">${section.description}</p>` : ''}
    <div class="table"><table>
      <thead><tr>${section.columns.map((c) => { return `<th>${escape(c)}</th>`; }).join('')}</tr></thead>
      <tbody>${section.rows.map((row) => {
            return `<tr>${row.cells.map((cell, i) => {
                return i === 0 ? `<td><code>${escape(cell)}</code></td>` : `<td class="tone-${row.tone || 'none'}">${escape(cell)}</td>`;
            }).join('')}</tr>`;
        }).join('')}</tbody>
    </table></div>
  </section>`;
    }).join('\n  ')}

  <section>
    <h2>Endpoints</h2>
    <p class="secondary">${profile.coverage}</p>
    <div class="groups">${groupRoutes(routes).map(([resource, items]) => {
        const title = resource.replace(/_/g, ' ');

        return `<div class="group"><h3>${escape(title.charAt(0).toUpperCase() + title.slice(1))}</h3><table class="endpoints">${items.map((r) => {
            return `<tr><td class="method ${METHOD_CLASS[r.method] || ''}">${escape(r.method)}</td><td class="path">${escape(r.path)}</td><td class="summary">${escape(r.summary || '')}</td></tr>`;
        }).join('')}</table></div>`;
    }).join('')}</div>
  </section>

  <section>
    <h2>Source of truth</h2>
    <p class="secondary">The mock is built from these and tested against them.</p>
    <div class="table"><table class="sources">${profile.sources.map((s) => {
        return `<tr><td><a href="${escape(s.href)}" rel="noopener">${escape(s.label)}</a></td><td class="secondary">${escape(s.detail || '')}</td></tr>`;
    }).join('')}</table></div>
  </section>

  <footer><span>Postman API mocks</span><span>For agents: <a href="/llms.txt">llms.txt</a>, or <code>GET /docs</code> with <code>Accept: application/json</code></span></footer>
</main>
<script>
  // Mark the scenario that served this page, in a neutral tone: the table also lists failure scenarios.
  document.querySelectorAll('tr[data-scenario="{{SCENARIO}}"]').forEach(function (row) {
    row.className = 'current';
    var tag = document.createElement('span');
    tag.className = 'now';
    tag.textContent = 'this page';
    row.firstChild.appendChild(tag);
  });
  document.querySelectorAll('.copy').forEach(function (button) {
    button.addEventListener('click', function () {
      var holder = button.closest('.field') || button.closest('.code');
      var source = holder.querySelector('[data-copy]') || holder.querySelector('pre');
      var text = source.textContent;
      var done = function () {
        button.classList.add('copied');
        setTimeout(function () { button.classList.remove('copied'); }, 1500);
      };
      if (navigator.clipboard) { navigator.clipboard.writeText(text).then(done, function () {}); }
    });
  });
</script>
</body>
</html>`;
}

function buildDocs ({ manifest, profile, scenarios, routes, apiVersion }) {
    // Run it once straight from Postman, or add it to a project so teammates and CI get the same mock.
    // {{MOCK_ID}} is this environment's id for the mock, filled in per request.
    const local = {
        run: ['postman mock run {{MOCK_ID}}'],
        project: [
            'postman dependency add mock {{MOCK_ID}}',
            `postman mock run "postman/.dependencies/mocks/${manifest.name}"`
        ]
    };

    const descriptor = {
        name: `${manifest.name} mock`,
        provider: profile.provider,
        maintainedBy: `Postman (not affiliated with ${profile.provider})`,
        apiVersion,
        standsInFor: manifest.origins,
        baseUrl: '{{BASE_URL}}',
        currentScenario: '{{SCENARIO}}',
        session: { header: 'x-mock-session', required: '{{SESSION_REQUIRED}}' },
        mockId: '{{MOCK_ID}}',
        scenarios: scenarios.map((s) => {
            return { name: s.name, title: s.title, description: s.description, select: { header: 'x-mock-scenario', value: s.name } };
        }),
        endpoints: routes.map((r) => { return `${r.method} ${r.path}`; }),
        testData: profile.testData,
        sources: profile.sources,
        useLocally: local
    };

    const llms = [
        `# ${manifest.name} mock`,
        '',
        `> ${profile.summary} Maintained by Postman; not affiliated with ${profile.provider}.`,
        '',
        `Base URL: {{BASE_URL}} (stands in for ${manifest.origins.join(' and ')})`,
        'Scenario: send the x-mock-scenario header. Current: {{SCENARIO}}.',
        '{{SESSION_LLMS}}',
        '',
        '## Scenarios',
        ...scenarios.map((s) => { return `- ${s.name}: ${s.description}`; }),
        '',
        '## Endpoints',
        ...routes.map((r) => { return `- ${r.method} ${r.path}`; }),
        '',
        '## Test data',
        ...profile.testData.map((t) => { return `- ${t.id}: ${t.result}`; }),
        '',
        '## Run it locally',
        `- Run it: ${local.run[0]}`,
        `- Add it to a project (restored with \`postman dependency install\`): ${local.project.join(' && ')}`,
        '',
        '## Source of truth',
        ...profile.sources.map((s) => { return `- ${s.label}: ${s.href}`; }),
        ''
    ].join('\n');

    const html = docsPage({ manifest, profile, scenarios, routes, apiVersion, local });

    return { html, descriptor, llms };
}

// The environment a hosted mock is served from, by its host; a local run takes the first one it is published to.
function envFor (host, local) {
    const ids = META.mockIds || {};
    const name = String(host).split(':')[0];

    return local ? ['prod', 'stage', 'beta'].find((candidate) => { return ids[candidate]; }) || 'prod' :
        /postman-stage\.dev$/.test(name) ? 'stage' : /postman-beta\.dev$/.test(name) ? 'beta' : 'prod';
}

// The app in each environment. "Open in Postman" opens the mock server there; Postman asks a signed-out
// visitor to sign in or sign up first and then lands them on it, so the page needs no sign-up link of its own.
const APP = { prod: 'https://go.postman.co', stage: 'https://go.postman-stage.co', beta: 'https://go.postman-beta.co' };

// The header's link for an environment, tagged so visits and sign-ups from these pages can be counted.
function linksFor (env) {
    const server = (META.serverIds || {})[env];
    const workspace = (META.workspaceIds || {})[env];
    const open = server && workspace ? `${APP[env]}/workspace/${workspace}/mock-server/${server}` :
        'https://www.postman.com/postman/popular-mocks-catalog/overview';
    const utm = new URLSearchParams({ utm_source: 'mock-docs', utm_medium: 'referral', utm_campaign: 'popular-mocks', utm_content: META.manifest.name });

    return { open: `${open}?${utm}` };
}

// Rendered once, then filled in for each request's host and scenario.
function renderDocs ({ base, host, scenario, local }) {
    renderDocs.cache = renderDocs.cache || buildDocs(META);
    const env = envFor(host, local);
    const mockId = (META.mockIds || {})[env] || '<mockId>';
    const links = linksFor(env);

    // The example request goes to this page's own base URL: the hosted mock, unless it is run locally.
    const callTitle = local ? 'Call it' : 'Call the hosted mock';
    // A hosted mock is shared, so its API requests must name their state; a local one need not.
    const session = local ?
        {
            note: 'Optional here. Send <code>x-mock-session</code> to keep separate sets of data.',
            llms: 'Session: optional here; send x-mock-session to keep separate sets of data.',
            required: 'false'
        } :
        {
            note: 'Required. Send <code>x-mock-session</code> with an id of your own, such as a random UUID; ' +
                'each id gets its own data. The examples read it from <code>$MOCK_SESSION</code>.',
            llms: 'Session: required. Send the x-mock-session header on every API request, with an id of your own, such as a ' +
                'random UUID; each id gets its own data.',
            required: 'true'
        };
    const fill = (text) => {
        return text.replace(/\{\{BASE_URL\}\}/g, base).replace(/\{\{HOST\}\}/g, host).replace(/\{\{SCENARIO\}\}/g, scenario)
            .replace(/\{\{MOCK_ID\}\}/g, mockId).replace(/\{\{CALL_TITLE\}\}/g, callTitle).replace(/\{\{SESSION_NOTE\}\}/g, session.note)
            .replace(/\{\{OPEN_URL\}\}/g, escape(links.open))
            .replace(/\{\{SESSION_LLMS\}\}/g, session.llms).replace(/"\{\{SESSION_REQUIRED\}\}"/g, session.required);
    };
    const { html, descriptor, llms } = renderDocs.cache;

    return { html: fill(html), llms: fill(llms), descriptor: JSON.parse(fill(JSON.stringify(descriptor))) };
}

// ═══ META: what the docs page shows ══════════════════════════════════════════════════════════════
const META = {
  "manifest": {
    "name": "OpenAI API",
    "origins": [
      "api.openai.com"
    ]
  },
  "apiVersion": "2.3.0",
  "mockIds": {
    "beta": "da81e93c-9018-4f35-8acd-1217ac34dd5c",
    "stage": "669d8e71-a557-403f-886b-82a85df3a482",
    "prod": "becdb0f7-a6fb-4c2c-91b1-bf76b54b1a84"
  },
  "serverIds": {
    "beta": "01a1b094-00bc-70cf-8025-ebb3ab26870c",
    "stage": "01a1ccc1-3207-76e9-a06c-e25be8edcdd7",
    "prod": "01a1cccd-6a54-737d-9750-69a901efccd4"
  },
  "workspaceIds": {
    "beta": "5036b5b6-2d7b-402e-93d3-2e04c8af733a",
    "stage": "c03ad9e5-0dc4-4c23-a499-c7f887863959",
    "prod": "58d3a3f3-5efe-4212-92d6-fa6a6691d712"
  },
  "profile": {
    "provider": "OpenAI",
    "summary": "A stateful, deterministic mock of the OpenAI API. Use the official OpenAI library as usual: chat completions, responses, tool calls, structured output, streaming and embeddings behave as on OpenAI, with answers your tests can assert on, and no tokens spent.",
    "auth": "No real key needed: any key in OpenAI's format, like <code>sk-test</code>.",
    "versionDocs": "https://github.com/openai/openai-openapi",
    "snippets": [
      {
        "label": "Postman CLI",
        "code": "postman request POST {{BASE_URL}}/v1/chat/completions \\\n  --auth-bearer-token sk-test \\\n  -H \"Content-Type:application/json\" \\\n  -H \"x-mock-session: $MOCK_SESSION\" \\\n  -d '{\"model\":\"gpt-4.1-mini\",\"messages\":[{\"role\":\"user\",\"content\":\"Say hello\"}]}'"
      }
    ],
    "dataSections": [
      {
        "title": "Test markers",
        "description": "Put a marker in the last user message (or the moderation input) to get that outcome. Without one, the reply quotes the message, structured output follows the schema, and an offered tool is called.",
        "columns": [
          "Marker",
          "Result"
        ],
        "rows": [
          {
            "cells": [
              "[mock:refuse]",
              "A refusal: \"I'm sorry, but I can't help with that.\""
            ],
            "tone": "warning"
          },
          {
            "cells": [
              "[mock:length]",
              "finish_reason length; a response is incomplete (max_output_tokens)"
            ],
            "tone": "warning"
          },
          {
            "cells": [
              "[mock:content_filter]",
              "finish_reason content_filter; a response is incomplete (content_filter)"
            ],
            "tone": "warning"
          },
          {
            "cells": [
              "[mock:context_length]",
              "400 context_length_exceeded"
            ],
            "tone": "error"
          },
          {
            "cells": [
              "[mock:text]",
              "Answer in text even when tools are offered"
            ],
            "tone": "success"
          },
          {
            "cells": [
              "[mock:flagged]",
              "Moderation flags the input (harassment); [mock:flagged:violence] for another category"
            ],
            "tone": "error"
          }
        ]
      }
    ],
    "coverage": "Also follows OpenAI's error format and codes, unknown-parameter checks, the model list in OpenAI's spec, stored completions and responses, previous_response_id, and base64 embeddings. Streams arrive whole: every event is sent at once, at the end. Not covered yet: audio, images, files, assistants, batches, fine-tuning and realtime.",
    "sources": [
      {
        "label": "OpenAI OpenAPI spec",
        "href": "https://github.com/openai/openai-openapi",
        "detail": "openapi.json"
      },
      {
        "label": "API reference",
        "href": "https://platform.openai.com/docs/api-reference"
      },
      {
        "label": "Error codes",
        "href": "https://platform.openai.com/docs/guides/error-codes"
      }
    ],
    "testData": [
      {
        "id": "[mock:refuse]",
        "result": "refusal"
      },
      {
        "id": "[mock:length]",
        "result": "finish_reason length / incomplete"
      },
      {
        "id": "[mock:content_filter]",
        "result": "finish_reason content_filter / incomplete"
      },
      {
        "id": "[mock:context_length]",
        "result": "400 context_length_exceeded"
      },
      {
        "id": "[mock:text]",
        "result": "no tool call"
      },
      {
        "id": "[mock:flagged]",
        "result": "moderation flagged"
      }
    ]
  },
  "scenarios": [
    {
      "name": "default",
      "title": "OpenAI, deterministic",
      "description": "Answers are deterministic: a reply that quotes the last user message, JSON that matches the requested schema, a call to the first tool when tools are offered, and embeddings derived from the input. Markers in the prompt ([mock:refuse], [mock:length], …) give the other outcomes."
    },
    {
      "name": "refusals",
      "title": "Every completion is a refusal",
      "description": "Every chat completion and response refuses: a `refusal` instead of content, as a model does for a request it won't answer. Embeddings, moderations and models behave normally."
    },
    {
      "name": "truncated",
      "title": "Every completion hits the token limit",
      "description": "Every chat completion ends with finish_reason `length`, and every response is `incomplete` (max_output_tokens), with the text cut short."
    },
    {
      "name": "rate-limited",
      "title": "Every request is rate limited",
      "description": "Every request is a 429 rate_limit_exceeded, with retry-after and x-ratelimit-* headers."
    },
    {
      "name": "insufficient-quota",
      "title": "The account is out of credits",
      "description": "Every request is a 429 insufficient_quota, which retrying does not fix."
    },
    {
      "name": "server-error",
      "title": "OpenAI is failing",
      "description": "Every request is a 500 server_error."
    },
    {
      "name": "overloaded",
      "title": "OpenAI is overloaded",
      "description": "Every request is a 503: the engine is currently overloaded."
    }
  ],
  "routes": [
    {
      "method": "POST",
      "path": "/v1/chat/completions",
      "summary": "Create chat completion"
    },
    {
      "method": "GET",
      "path": "/v1/chat/completions",
      "summary": "List Chat Completions"
    },
    {
      "method": "GET",
      "path": "/v1/chat/completions/:completion_id",
      "summary": "Get chat completion"
    },
    {
      "method": "DELETE",
      "path": "/v1/chat/completions/:completion_id",
      "summary": "Delete chat completion"
    },
    {
      "method": "POST",
      "path": "/v1/responses",
      "summary": "Create a model response"
    },
    {
      "method": "GET",
      "path": "/v1/responses/:response_id",
      "summary": "Get a model response"
    },
    {
      "method": "DELETE",
      "path": "/v1/responses/:response_id",
      "summary": "Delete a model response"
    },
    {
      "method": "POST",
      "path": "/v1/embeddings",
      "summary": "Create embeddings"
    },
    {
      "method": "POST",
      "path": "/v1/moderations",
      "summary": "Create moderation"
    },
    {
      "method": "GET",
      "path": "/v1/models",
      "summary": "List models"
    },
    {
      "method": "GET",
      "path": "/v1/models/:model",
      "summary": "Retrieve model"
    }
  ]
};

// ═══ SPEC: parameter types and object fields from the OpenAPI spec ═══════════════════════════════
const SPEC = {
  "version": "2.3.0",
  "params": {
    "POST /v1/chat/completions": {
      "metadata": "object",
      "top_logprobs": [
        "integer",
        "null"
      ],
      "temperature": "integer",
      "top_p": "integer",
      "user": [
        "string",
        "null"
      ],
      "safety_identifier": "string",
      "prompt_cache_key": "string",
      "prompt_cache_retention": "string",
      "prompt_cache_options": "object",
      "messages": "array",
      "model": "string",
      "service_tier": "string",
      "modalities": "array",
      "verbosity": "string",
      "reasoning_effort": "string",
      "max_completion_tokens": [
        "integer",
        "null"
      ],
      "frequency_penalty": [
        "number",
        "null"
      ],
      "presence_penalty": [
        "number",
        "null"
      ],
      "web_search_options": "object",
      "response_format": "object",
      "audio": [
        "object",
        "null"
      ],
      "store": [
        "boolean",
        "null"
      ],
      "moderation": "object",
      "stream": [
        "boolean",
        "null"
      ],
      "stop": "object",
      "logit_bias": [
        "object",
        "null"
      ],
      "logprobs": [
        "boolean",
        "null"
      ],
      "max_tokens": [
        "integer",
        "null"
      ],
      "n": [
        "integer",
        "null"
      ],
      "prediction": "object",
      "seed": [
        "integer",
        "null"
      ],
      "stream_options": "object",
      "tools": "array",
      "tool_choice": "object",
      "parallel_tool_calls": "boolean",
      "function_call": "object",
      "functions": "array"
    },
    "GET /v1/chat/completions": {
      "model": "string",
      "metadata": "object",
      "after": "string",
      "limit": "integer",
      "order": "string"
    },
    "GET /v1/chat/completions/:completion_id": {},
    "DELETE /v1/chat/completions/:completion_id": {},
    "POST /v1/responses": {
      "metadata": "object",
      "top_logprobs": "integer",
      "temperature": "integer",
      "top_p": "integer",
      "user": [
        "string",
        "null"
      ],
      "safety_identifier": "string",
      "prompt_cache_key": "string",
      "prompt_cache_retention": "string",
      "previous_response_id": "string",
      "model": "string",
      "background": "boolean",
      "max_tool_calls": "integer",
      "text": "object",
      "tools": "array",
      "tool_choice": "object",
      "prompt": "object",
      "access_programs": "object",
      "image": "object",
      "prompt_cache_options": "object",
      "service_tier": "string",
      "truncation": "string",
      "reasoning": "object",
      "input": "object",
      "include": "array",
      "parallel_tool_calls": "boolean",
      "store": "boolean",
      "instructions": "string",
      "moderation": "object",
      "stream": "boolean",
      "stream_options": "object",
      "conversation": "object",
      "context_management": "array",
      "max_output_tokens": "integer"
    },
    "GET /v1/responses/:response_id": {
      "include": "array",
      "stream": "boolean",
      "starting_after": "integer",
      "include_obfuscation": "boolean"
    },
    "DELETE /v1/responses/:response_id": {},
    "POST /v1/embeddings": {
      "input": "object",
      "model": "string",
      "encoding_format": "string",
      "dimensions": "integer",
      "user": "string"
    },
    "POST /v1/moderations": {
      "input": "object",
      "model": "string"
    },
    "GET /v1/models": {},
    "GET /v1/models/:model": {}
  },
  "models": {
    "text": [
      "gpt-6-astra",
      "gpt-6.1-sol",
      "gpt-6.1-terra",
      "gpt-6-sol",
      "gpt-6-luna",
      "gpt-5.6-sol",
      "gpt-5.6-terra",
      "gpt-5.6-luna",
      "gpt-5.5",
      "gpt-5.5-2026-04-23",
      "gpt-5.4",
      "gpt-5.4-mini",
      "gpt-5.4-nano",
      "gpt-5.4-mini-2026-03-17",
      "gpt-5.4-nano-2026-03-17",
      "gpt-5.3-chat-latest",
      "gpt-5.2",
      "gpt-5.2-2025-12-11",
      "gpt-5.2-chat-latest",
      "gpt-5.2-pro",
      "gpt-5.2-pro-2025-12-11",
      "gpt-5.1",
      "gpt-5.1-2025-11-13",
      "gpt-5.1-codex",
      "gpt-5.1-mini",
      "gpt-5.1-chat-latest",
      "gpt-5",
      "gpt-5-mini",
      "gpt-5-nano",
      "gpt-5-2025-08-07",
      "gpt-5-mini-2025-08-07",
      "gpt-5-nano-2025-08-07",
      "gpt-5-chat-latest",
      "gpt-4.1",
      "gpt-4.1-mini",
      "gpt-4.1-nano",
      "gpt-4.1-2025-04-14",
      "gpt-4.1-mini-2025-04-14",
      "gpt-4.1-nano-2025-04-14",
      "o4-mini",
      "o4-mini-2025-04-16",
      "o3",
      "o3-2025-04-16",
      "o3-mini",
      "o3-mini-2025-01-31",
      "o1",
      "o1-2024-12-17",
      "o1-preview",
      "o1-preview-2024-09-12",
      "o1-mini",
      "o1-mini-2024-09-12",
      "gpt-4o",
      "gpt-4o-2024-11-20",
      "gpt-4o-2024-08-06",
      "gpt-4o-2024-05-13",
      "gpt-audio-mini",
      "gpt-audio-mini-2025-12-15",
      "gpt-4o-audio-preview",
      "gpt-4o-audio-preview-2024-10-01",
      "gpt-4o-audio-preview-2024-12-17",
      "gpt-4o-audio-preview-2025-06-03",
      "gpt-4o-mini-audio-preview",
      "gpt-4o-mini-audio-preview-2024-12-17",
      "gpt-4o-search-preview",
      "gpt-4o-mini-search-preview",
      "gpt-4o-search-preview-2025-03-11",
      "gpt-4o-mini-search-preview-2025-03-11",
      "chatgpt-4o-latest",
      "codex-mini-latest",
      "gpt-4o-mini",
      "gpt-4o-mini-2024-07-18",
      "gpt-4-turbo",
      "gpt-4-turbo-2024-04-09",
      "gpt-4-0125-preview",
      "gpt-4-turbo-preview",
      "gpt-4-1106-preview",
      "gpt-4-vision-preview",
      "gpt-4",
      "gpt-4-0314",
      "gpt-4-0613",
      "gpt-4-32k",
      "gpt-4-32k-0314",
      "gpt-4-32k-0613",
      "gpt-3.5-turbo",
      "gpt-3.5-turbo-16k",
      "gpt-3.5-turbo-0301",
      "gpt-3.5-turbo-0613",
      "gpt-3.5-turbo-1106",
      "gpt-3.5-turbo-0125",
      "gpt-3.5-turbo-16k-0613"
    ],
    "responses": [
      "o1-pro",
      "o1-pro-2025-03-19",
      "o3-pro",
      "o3-pro-2025-06-10",
      "o3-deep-research",
      "o3-deep-research-2025-06-26",
      "o4-mini-deep-research",
      "o4-mini-deep-research-2025-06-26",
      "computer-use-preview",
      "computer-use-preview-2025-03-11",
      "gpt-5.5-pro",
      "gpt-5.5-pro-2026-04-23",
      "gpt-5-codex",
      "gpt-5-pro",
      "gpt-5-pro-2025-10-06",
      "gpt-5.1-codex-max",
      "gpt-daybreak-blue-latest",
      "gpt-daybreak-red-latest",
      "gpt-5.6-cyber",
      "gpt-6-cyber",
      "gpt-rosalind-research",
      "gpt-6-rosalind"
    ],
    "embedding": [
      "text-embedding-ada-002",
      "text-embedding-3-small",
      "text-embedding-3-large"
    ],
    "moderation": [
      "omni-moderation-latest",
      "omni-moderation-2024-09-26",
      "text-moderation-latest",
      "text-moderation-stable"
    ]
  },
  "moderationCategories": [
    "hate",
    "hate/threatening",
    "harassment",
    "harassment/threatening",
    "illicit",
    "illicit/violent",
    "self-harm",
    "self-harm/intent",
    "self-harm/instructions",
    "sexual",
    "sexual/minors",
    "violence",
    "violence/graphic"
  ]
};

start();
