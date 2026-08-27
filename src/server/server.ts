import { init, LDContext, basicLogger, LDOptions, integrations } from '@launchdarkly/node-server-sdk';
import { Observability } from '@launchdarkly/observability-node'
import express from 'express';
import cors from 'cors';
import 'dotenv/config';

// Debug: Check if LD_SDK_KEY is being loaded
console.log('DEBUG - LD_SDK_KEY from env:', process.env.LD_SDK_KEY);
console.log('DEBUG - LD_SDK_KEY length:', process.env.LD_SDK_KEY?.length);
console.log('DEBUG - NODE_ENV:', process.env.NODE_ENV);

const PORT = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV === 'development';
const isProd = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

// Create TestData source for test environment
const testData = new integrations.TestData();

// Configure test flag defaults
if (isTest) {
    testData.update(testData.flag('release-new-api-guardian-demo').booleanFlag().variationForAll(false));
    testData.update(testData.flag('guardian-demo-old-error-rate').valueForAll(10));
    testData.update(testData.flag('guardian-demo-new-error-rate').valueForAll(30));
}

// Determine SDK credential based on environment
const sdkCredential = isDev
    ? 'guardian-demo'
    : isTest
        ? 'whatever-fake-key-you-want'  // Can be any string for test mode
        : process.env.LD_SDK_KEY ?? '';

// Configure logger for SDK initialization details
const logger = basicLogger({
    level: isDev ? 'debug' : 'info',
    destination: console.log,
});

// Build LD options based on environment
const ldOptions: LDOptions = isTest
    ? {
        // Test options - use TestData source
        logger: logger,
        updateProcessor: testData.getFactory(),
        sendEvents: false,  // Don't send events during tests
    }
    : isDev
        ? {
            // Dev options - connect to local dev-server
            logger: logger,
            timeout: 5,
            baseUri: 'http://localhost:8765',
            streamUri: 'http://localhost:8765',
            eventsUri: 'http://localhost:8765',
        }
        : {
            // Production options - connecting to LD staging
            logger: logger,
            timeout: 5,
            baseUri: 'https://ld-stg.launchdarkly.com',
            streamUri: 'https://stream-stg.launchdarkly.com/',
            eventsUri: 'https://events-stg.launchdarkly.com/',
            application: {
                id: 'guardian-demo-backend',
                version: '1.0.0'
            },
            plugins: [new Observability({
                serviceName: 'guarded-rollout-demo',
                environment: 'production'
            })],
        };

if (isDev) {
    console.log('🔧 Using local LaunchDarkly server at localhost:8765');
}
if (isTest) {
    console.log('🧪 Using TestData source for flag values');
}

// Initialize LaunchDarkly client
const ldClient = init(sdkCredential, ldOptions);

// Export testData so tests can modify flag values
export { testData, ldClient };

const app = express();
app.use(cors());

// setting up a user context, we'll need to fill in the key as a unique identifier later
const context: LDContext = {
    "kind": 'user',
    "key": 'Matt-Damon'
};


// basic API endpoint, using LaunchDarkly to migrate from an old version to a new one
app.get('/:key', async (req, res) => {
    context.key = req.params.key
    const serveNewApi = await ldClient.variation('release-new-api-guardian-demo', context, false);
    const oldErrorRate = await ldClient.variation('guardian-demo-old-error-rate', context, 10); // 10 is the fallback
    const newErrorRate = await ldClient.variation('guardian-demo-new-error-rate', context, 30); // 30 is the fallback
    const rand = Math.random() * 100

    // express will automatically send a 500 status with the error details if an unhandled error occurs in a route
    const oldAPI = async () => {
        if (rand < oldErrorRate) {
            throw new Error('OLD API ERROR')
        }
        res.status(200).json({ msg: 'OLD', errorRate: oldErrorRate })
    }

    const newAPI = async () => {
        if (rand < newErrorRate) {
            throw new Error('NEW API ERROR')
        }
        res.status(200).json({ msg: 'NEW', errorRate: newErrorRate })
    }

    // Use our flag to determine which code path to execute
    if (serveNewApi) {
        await newAPI()
    }
    else {
        await oldAPI()
    }
})


// Start the server
app.listen(PORT, function (err) {
    if (err) {
        console.error('Error starting server:', err)
        return
    }
    console.log(`🚀 Server running on port ${PORT}`)
    console.log(`🔧 Make sure you have set up your LD_SDK_KEY in .env`)
})