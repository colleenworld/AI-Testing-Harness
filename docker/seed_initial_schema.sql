CREATE TABLE IF NOT EXISTS evaluation_runs (
                                               id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id VARCHAR(255) NOT NULL,
    task_id VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    prompt TEXT NOT NULL,
    raw_output TEXT NOT NULL,
    ground_truth TEXT NOT NULL,
    score_factuality INT,
    score_citation INT,
    score_formatting INT,
    latency_ms INT,
    token_cost_usd NUMERIC(10, 6),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                             );

-- 1. Ensure the golden_tasks reference repository table exists
CREATE TABLE IF NOT EXISTS golden_tasks (
                                            task_id VARCHAR(100) PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    prompt TEXT NOT NULL,
    search_query_template TEXT
    );

-- 2. Populate the 50-task broad evaluation dataset
BEGIN;

INSERT INTO golden_tasks (task_id, category, prompt, search_query_template) VALUES
-- --- CATEGORY 1: TEMPORAL & LIVE NEWS ---
('task_1_01', 'Temporal & Live News', 'What were the top three structural takeaways from the federal interest rate decision announced this week?', 'federal reserve interest rate decision announcement news current week'),
('task_1_02', 'Temporal & Live News', 'Summarize the opening weekend box office numbers and critical reception metrics for the highest-grossing movie released today.', 'highest grossing movie opening weekend box office numbers critical reviews'),
('task_1_03', 'Temporal & Live News', 'What is the current stock price of Apple (AAPL) and what was the main driver behind its latest intra-day movement?', 'AAPL stock price news current market mover today'),
('task_1_04', 'Temporal & Live News', 'Detail the outcome of yesterday''s high-profile European football match, including goal scorers and critical injuries.', 'european football match results yesterday scores goals injuries'),
('task_1_05', 'Temporal & Live News', 'What major corporate merger or acquisition was announced in the tech sector over the last 48 hours?', 'technology sector corporate acquisition merger announcement current week'),
('task_1_06', 'Temporal & Live News', 'Summarize the active weather warnings currently issued for the tristate area and their expected infrastructure impact.', 'active weather warnings infrastructure impact tristate area today'),
('task_1_07', 'Temporal & Live News', 'Who won the political election or primary held earlier this week, and what was the final voting percentage breakdown?', 'election results primary voting percentage breakdown current week'),
('task_1_08', 'Temporal & Live News', 'What are the core technical specifications of the new smartphone flagship model announced by Google/Samsung this month?', 'latest smartphone flagship specifications announcement review current month'),
('task_1_09', 'Temporal & Live News', 'What structural policy changes did the local transit authority implement this week regarding scheduling and fares?', 'city transit authority fare change schedule update current week'),
('task_1_10', 'Temporal & Live News', 'Provide a summary of the breaking space exploration milestone announced by NASA or SpaceX within the last 7 days.', 'space exploration launch milestone NASA SpaceX current week'),

-- --- CATEGORY 2: MULTI-SOURCE SYNTHESIS & CONFLICT RESOLUTION ---
('task_2_01', 'Multi-Source Synthesis', 'Look at recent reports on global EV adoption rates for this year. Synthesize the conflicting projection figures offered by the IEA versus legacy oil market analysts.', 'global EV adoption rate projections growth conflict analysis'),
('task_2_02', 'Multi-Source Synthesis', 'There are conflicting numbers regarding the civilian casualty counts or displacement metrics in the current active geopolitical conflict zone. Present the data from three distinct international watchdog agencies.', 'geopolitical conflict humanitarian tracking data conflicting reports'),
('task_2_03', 'Multi-Source Synthesis', 'Synthesize the current critical debate surrounding the safety profiles of the latest weight-loss medications. Contrast academic clinical trial data with independent long-term observational studies.', 'glp-1 weight loss drug safety controversy clinical trial vs observational'),
('task_2_04', 'Multi-Source Synthesis', 'Compare the economic health metrics of the UK this quarter as described by the optimistic government press releases versus the pessimistic financial times reviews.', 'UK economic growth metrics critique government vs independent analysts'),
('task_2_05', 'Multi-Source Synthesis', 'Analyze the media coverage surrounding the sudden resignation of the tech CEO this week. Contrast the official company narrative with the investigative journalism leaks.', 'tech CEO sudden resignation leak vs official company statement'),
('task_2_06', 'Multi-Source Synthesis', 'Review the historical debate on the efficiency of universal basic income trials. Present the conflicting structural conclusions of the Finnish study versus the recent US tech-backed experiments.', 'universal basic income trial results finland vs united states efficacy'),
('task_2_07', 'Multi-Source Synthesis', 'What is the true cost of upgrading a legacy enterprise cloud stack to microservices? Contrast developer marketing claims with CIO post-mortem survey metrics.', 'enterprise microservices migration cost architecture success rate surveys'),
('task_2_08', 'Multi-Source Synthesis', 'Synthesize the conflicting consumer sentiment indices released this month. Why is consumer confidence rising while retail spending trends down?', 'consumer confidence index vs retail sales data current month divergence'),
('task_2_09', 'Multi-Source Synthesis', 'Review the environmental impact analysis of deep-sea mining. Contrast the positions of the International Seabed Authority with marine biology coalition whitepapers.', 'deep sea mining environmental impact study controversy ISA vs biologists'),
('task_2_10', 'Multi-Source Synthesis', 'Compare the performance benchmarks of the newly open-sourced AI model across independent Hugging Face leaderboards versus the creator''s official paper benchmarks.', 'new open source AI model independent benchmarks vs paper evaluation'),

-- --- CATEGORY 3: COMPLEX CODE GENERATION & API ADAPTABILITY ---
('task_3_01', 'Complex Code Generation', 'Write a TypeScript script to initialize a modern Pinecone vector index and upsert a batch of embeddings using their latest v4+ SDK architecture.', 'Pinecone vector database node client upsert embeddings v4 migration documentation'),
('task_3_02', 'Complex Code Generation', 'Generate a complete Python script using the modern LangChain expression language (LCEL) to pipe an OpenAI prompt template into a streaming output parser.', 'LangChain expression language LCEL prompt model streaming output parser python'),
('task_3_03', 'Complex Code Generation', 'Write a React component leveraging Next.js App Router server actions to safely mutate data in a PostgreSQL database using Prisma.', 'Next.js App Router server actions form mutation prisma postgresql example'),
('task_3_04', 'Complex Code Generation', 'Produce a production-ready AWS CDK stack in TypeScript that provisions an API Gateway HTTP API integrated directly with an isolated Lambda function.', 'AWS CDK v2 apigatewayv2 http api lambda integration typescript'),
('task_3_05', 'Complex Code Generation', 'Write a Python script using the modern httpx client to fetch data concurrently from an array of 5 endpoints using async/await syntax.', 'python httpx async client request concurrency async await'),
('task_3_06', 'Complex Code Generation', 'Generate a Node.js script using the modern @google/genai SDK to execute a multimodal inference task passing a local image path.', 'google genai sdk nodejs multimodal image inference generateContent'),
('task_3_07', 'Complex Code Generation', 'Write a Dockerfile multi-stage build configuration optimized for an esbuild-compiled TypeScript Node production environment.', 'dockerfile multistage build node typescript esbuild production optimization'),
('task_3_08', 'Complex Code Generation', 'Generate a Pydantic v2 data verification model configuration showing custom field validators and clean type coercion.', 'Pydantic v2 field_validator model_validator syntax migration example'),
('task_3_09', 'Complex Code Generation', 'Write an automated integration test suite using Playwright in TypeScript to assert complex user login authentication states.', 'playwright typescript authentication state preservation storageState test example'),
('task_3_10', 'Complex Code Generation', 'Generate a structural database migration script in pure SQL that converts a standard column to an indexed vector column for pgvector.', 'pgvector sql migration script add vector column index ivfflat hnsw'),

-- --- CATEGORY 4: ACADEMIC & COMPLEX CONTEXT PARSING ---
('task_4_01', 'Academic & Context Parsing', 'Analyze the latest published research on room-temperature superconductor candidates this year. What are the reported crystal structures and ambient pressure limits?', 'room temperature superconductor research crystal structure ambient pressure limits arxiv'),
('task_4_02', 'Academic & Context Parsing', 'Summarize the clinical efficacy metrics of the newly approved CRISPR gene-therapy trial for sickle-cell disease based on recent medical publications.', 'CRISPR gene therapy sickle cell disease clinical trial efficacy results publication'),
('task_4_03', 'Academic & Context Parsing', 'What changes did the European Union implement regarding compliance requirements for frontier AI models under the newly enacted AI Act clauses?', 'EU AI Act frontier model compliance system risk requirements clauses'),
('task_4_04', 'Academic & Context Parsing', 'Explain the architectural mechanics of the newly released open-weights architecture framework. How does its Mixture-of-Experts (MoE) routing layer scale active parameters?', 'mixture of experts MoE routing layer architecture transformer parameter activation'),
('task_4_05', 'Academic & Context Parsing', 'Summarize the findings of the latest IPCC climate report update regarding ocean temperature anomalies and methane emission tracking metrics.', 'IPCC climate report ocean temperature anomaly methane tracking statistics'),


