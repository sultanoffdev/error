const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { OpenAI } = require('openai');
require('dotenv').config();

// Initialize OpenAI
const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // ✅ Безопаснее


// Knowledge base for RAG
const knowledgeBase = {
    company_info: {
        name: "ГК «Метры»",
        experience: "7 лет на рынке",
        specialization: "строительство доходных студий",
        current_projects: "около 40 студий в сердце Петербурга",
        yield: "доходность от 35% с первого года на полном пассиве"
    },
    property_info: {
        min_price: "5.9 млн",
        max_price: "10.5 млн",
        location: "центр Петербурга",
        payment_method: "только наличный расчет",
        inventory_update: "каждые два месяца"
    },
    manager_info: {
        name: "Кирилл Сергеевич Рожков",
        phone: "+7 901 634-79-26",
        position: "персональный менеджер"
    },
    telegram_channel: {
        url: "https://t.me/+5AXgWVtjQFg1NDQy",
        content: "Инструкции, чек-листы, гайды, аналитика и экспертный взгляд"
    }
};

// Function to get relevant context from knowledge base
function getRelevantContext(message) {
    const relevantInfo = [];
    const messageLower = message.toLowerCase();

    // Check company info
    if (messageLower.includes('компания') || messageLower.includes('опыт') || messageLower.includes('специализация')) {
        relevantInfo.push(`Информация о компании: ${knowledgeBase.company_info.name}, ${knowledgeBase.company_info.experience}, ${knowledgeBase.company_info.specialization}`);
    }

    // Check property info
    if (messageLower.includes('цена') || messageLower.includes('стоимость') || messageLower.includes('расположение')) {
        relevantInfo.push(`Информация о недвижимости: студии от ${knowledgeBase.property_info.min_price} до ${knowledgeBase.property_info.max_price}, ${knowledgeBase.property_info.location}`);
    }

    // Check payment info
    if (messageLower.includes('оплата') || messageLower.includes('расчет') || messageLower.includes('ипотека')) {
        relevantInfo.push(`Информация об оплате: ${knowledgeBase.property_info.payment_method}`);
    }

    // Check manager info
    if (messageLower.includes('менеджер') || messageLower.includes('специалист') || messageLower.includes('консультант')) {
        relevantInfo.push(`Информация о менеджере: ${knowledgeBase.manager_info.name}, ${knowledgeBase.manager_info.phone}`);
    }

    return relevantInfo.join('\n');
}

// Function to enhance response with RAG
async function enhanceResponseWithRAG(message, response, context) {
    const relevantContext = getRelevantContext(message);
    
    const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
            { 
                role: "system", 
                content: `You are a real estate sales assistant. Use the following context to enhance your response:
                ${relevantContext}
                ${context}
                
                Make sure to:
                1. Include relevant information from the context
                2. Maintain a professional and friendly tone
                3. Keep the response concise and clear
                4. Use markdown formatting where appropriate`
            },
            { role: "user", content: message },
            { role: "assistant", content: response }
        ],
    });

    return completion.choices[0].message.content;
}

// Initialize WhatsApp client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox']
    }
});

// Store user states and conversation history
const userStates = new Map();
const conversationHistory = new Map();

// Generate QR code for WhatsApp Web
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('QR Code generated. Scan it with WhatsApp to login.');
});

// When client is ready
client.on('ready', () => {
    console.log('Client is ready!');
});

// Function to check if message is a greeting
function isGreeting(message) {
    const greetings = ['привет', 'здравствуйте', 'добрый день', 'доброе утро', 'добрый вечер', 'hi', 'hello'];
    return greetings.some(greeting => message.toLowerCase().includes(greeting));
}

// Function to check if message is a positive response
function isPositiveResponse(message) {
    const positiveResponses = ['да', 'конечно', 'ага', 'угу', 'yes', 'yeah', 'да, интересно', 'интересно'];
    return positiveResponses.some(response => message.toLowerCase().includes(response));
}

// Function to check if message is a negative response
function isNegativeResponse(message) {
    const negativeResponses = ['нет', 'не', 'no', 'не интересно', 'не актуально', 'ошиблись'];
    return negativeResponses.some(response => message.toLowerCase().includes(response));
}

// Function to check if message mentions mortgage
function isMortgageMentioned(message) {
    const mortgageKeywords = ['ипотека', 'ипотечный', 'кредит', 'заем', 'займ'];
    return mortgageKeywords.some(keyword => message.toLowerCase().includes(keyword));
}

// Function to check if message mentions cash payment
function isCashPaymentMentioned(message) {
    const cashKeywords = ['наличный', 'наличными', 'наличка', 'кэш', 'cash'];
    return cashKeywords.some(keyword => message.toLowerCase().includes(keyword));
}

// Function to check if message indicates long-term planning
function isLongTermPlanning(message) {
    const longTermKeywords = ['2-3 месяца', '2 месяца', '3 месяца', 'через 2', 'через 3', 'позже', 'не скоро', 'не в ближайшее время'];
    return longTermKeywords.some(keyword => message.toLowerCase().includes(keyword));
}

// Function to check if message indicates short-term planning
function isShortTermPlanning(message) {
    const shortTermKeywords = ['ближайшее', 'скоро', 'быстро', 'сейчас', 'в ближайшее время', 'в ближайшие дни'];
    return shortTermKeywords.some(keyword => message.toLowerCase().includes(keyword));
}

// Function to check if message indicates low budget
function isLowBudget(message) {
    const lowBudgetKeywords = ['5.8', '5,8', '5.7', '5,7', '5.6', '5,6', '5.5', '5,5', '5.4', '5,4', '5.3', '5,3', '5.2', '5,2', '5.1', '5,1', '5.0', '5,0', '5', '4', '3', '2', '1'];
    return lowBudgetKeywords.some(keyword => message.toLowerCase().includes(keyword));
}

// Function to get conversation context
function getConversationContext(userId) {
    const history = conversationHistory.get(userId) || [];
    return history.join('\n');
}

// Function to analyze message with ChatGPT
async function analyzeMessageWithGPT(message, context, userState) {
    const systemPrompt = `You are a real estate sales assistant. Analyze the client's message and determine the appropriate response based on the conversation context.
Current stage: ${userState.stage}
Previous context: ${context}

Available responses:
1. Initial greeting
2. Investment format question
3. Payment method question
4. Timing question
5. Price range question
6. Handoff to manager
7. Long-term planning response
8. Mortgage negative response

Respond with the number of the most appropriate response, or 'custom' if none fit.`;

    const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
        ],
    });

    return completion.choices[0].message.content;
}

// Handle incoming messages
client.on('message', async (message) => {
    const userId = message.from;
    const userMessage = message.body.toLowerCase();
    const userName = message._data.notifyName || 'Клиент';

    // Initialize user state and conversation history if not exists
    if (!userStates.has(userId)) {
        userStates.set(userId, { stage: 'initial' });
        conversationHistory.set(userId, []);
    }

    const userState = userStates.get(userId);
    const history = conversationHistory.get(userId);
    history.push(`Client: ${userMessage}`);

    try {
        // Analyze message with ChatGPT
        const analysis = await analyzeMessageWithGPT(userMessage, getConversationContext(userId), userState);
        
        let response;
        if (analysis === '1' || (userState.stage === 'initial' && isGreeting(userMessage))) {
            response = 'Вы рассматривали покупку студии в центре Петербурга. Вопрос актуален для вас?';
            userState.stage = 'waiting_for_response';
        }
        else if (analysis === '2' || userState.stage === 'positive_response') {
            response = 'Скажите пожалуйста, в целом формат инвестиций в недвижимость актуален для Вас?';
            userState.stage = 'waiting_for_investment_response';
        }
        else if (analysis === '3' || userState.stage === 'investment_positive') {
            response = 'У нас студии продаются только за наличный расчет, Вы как планировали покупку с привлечением ипотеки или без?';
            userState.stage = 'waiting_for_payment_response';
        }
        else if (analysis === '4' || userState.stage === 'waiting_for_timing_response') {
            if (isLongTermPlanning(userMessage)) {
                response = `${userName}, благодарю за ответ!
В таком случае, так как через 2 месяца у нас полностью обновится ассортимент, предлагаю пока остаться на связи. Приглашаю заглянуть в наш закрытый канал по инвестициям в историческую недвижимость Петербурга. 
*Инструкции, чек-листы, гайды*
Аналитика и экспертный взгляд
https://t.me/+5AXgWVtjQFg1NDQy

Буду рад держать вас в курсе!

Алексей Шилков
Руководитель спецпроектов ГК «Метры»`;
                userState.stage = 'long_term_planning';
            } else if (isShortTermPlanning(userMessage)) {
                response = `У нас студии от 5,9 до 10,5 млн
До какой стоимости вам выслать варианты?`;
                userState.stage = 'waiting_for_price_range';
            } else {
                response = 'Извините, не совсем понял. Вы планируете покупку в ближайшие два месяца или позже?';
                userState.stage = 'waiting_for_timing_response';
            }
        }
        else if (analysis === '5' || userState.stage === 'waiting_for_price_range') {
            if (isLowBudget(userMessage)) {
                response = `В Петербурге наши студии стартуют от 5,9 млн, иногда бывает так что мы согласуем для наших инвесторов индивидуальный формат расчета и отсрочки оплаты`;
                userState.stage = 'low_budget_response';
            } else {
                response = `Хорошо, ${userName}, благодарю за доверие!
Чтобы подобрать идеальные варианты, передам Вас в заботливые руки нашего лучшего специалиста.
Ваш персональный менеджер, Кирилл Сергеевич Рожков (+7 901 634-79-26), свяжется с вами в ближайшее время с самыми актуальными предложениями и пришлет варианты.
А пока загляните в наш Telegram-канал — там много интересного о студиях в сердце Петербурга: https://t.me/+5AXgWVtjQFg1NDQy`;
                userState.stage = 'handoff_to_manager';
            }
        }
        else if (analysis === '6' || userState.stage === 'handoff_to_manager') {
            response = `Хорошо, ${userName}, благодарю за доверие!
Чтобы подобрать идеальные варианты, передам Вас в заботливые руки нашего лучшего специалиста.
Ваш персональный менеджер, Кирилл Сергеевич Рожков (+7 901 634-79-26), свяжется с вами в ближайшее время с самыми актуальными предложениями и пришлет варианты.
А пока загляните в наш Telegram-канал — там много интересного о студиях в сердце Петербурга: https://t.me/+5AXgWVtjQFg1NDQy`;
        }
        else if (analysis === '7' || userState.stage === 'long_term_planning') {
            response = `${userName}, благодарю за ответ!
В таком случае, так как через 2 месяца у нас полностью обновится ассортимент, предлагаю пока остаться на связи. Приглашаю заглянуть в наш закрытый канал по инвестициям в историческую недвижимость Петербурга. 
*Инструкции, чек-листы, гайды*
Аналитика и экспертный взгляд
https://t.me/+5AXgWVtjQFg1NDQy

Буду рад держать вас в курсе!

Алексей Шилков
Руководитель спецпроектов ГК «Метры»`;
        }
        else if (analysis === '8' || userState.stage === 'mortgage_negative') {
            response = `Мы не работаем с ипотекой поэтому наши объекты Вам не подойдут.
В любом случае дорогой клиент благодарю за ответ!

Если в будущем вернетесь к этому вопросу, приглашаю в наш закрытый канал по инвестициям в историческую недвижимость Петербурга.
*Инструкции, чек-листы, гайды*
Аналитика и экспертный взгляд
https://t.me/+5AXgWVtjQFg1NDQy

Буду рад видеть Вас в нашем сообществе! 

Алексей Шилков 
Руководитель спецпроектов ГК «Метры»`;
        }
        else {
            // Use ChatGPT for custom responses
            const completion = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: "You are a helpful real estate sales assistant. Be professional and friendly." },
                    { role: "user", content: userMessage }
                ],
            });
            response = completion.choices[0].message.content;
        }

        // Enhance response with RAG
        response = await enhanceResponseWithRAG(userMessage, response, getConversationContext(userId));

        await message.reply(response);
        history.push(`Assistant: ${response}`);

    } catch (error) {
        console.error('Error:', error);
        await message.reply('Извините, произошла ошибка при обработке вашего сообщения.');
    }
});

// Handle authentication errors
client.on('auth_failure', (error) => {
    console.error('Authentication failed:', error);
});

// Handle disconnection
client.on('disconnected', (reason) => {
    console.log('Client was disconnected:', reason);
});

// Initialize the client
client.initialize(); 