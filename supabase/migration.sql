-- PingDesk Database Schema
-- Run this in Supabase SQL Editor to set up all tables

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- 1. Products table
create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  url text,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

-- 2. Keyword configs table
create table if not exists keyword_configs (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references products(id) on delete cascade,
  subreddits text[] default '{}',
  keywords text[] default '{}',
  created_at timestamp with time zone default now()
);

-- 3. Leads table
create table if not exists leads (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references products(id) on delete cascade,
  platform text default 'reddit',
  post_id text,
  post_url text,
  post_title text,
  post_body text,
  subreddit text,
  author text,
  relevance_score integer,
  relevance_reason text,
  drafted_reply text,
  humanized_reply text,
  humanizer_status text default 'pending',
  status text default 'pending',
  created_at timestamp with time zone default now()
);

-- Create unique index on post_id for dedup
create unique index if not exists leads_post_id_idx on leads(post_id);

-- 4. Composed messages table
create table if not exists composed_messages (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references products(id) on delete set null,
  platform text,
  context text,
  tone text,
  message_type text,
  raw_draft text,
  humanized_output text,
  created_at timestamp with time zone default now()
);

-- =====================
-- SEED DATA
-- =====================

-- Insert 7 products
insert into products (id, name, description, url) values
  ('11111111-1111-1111-1111-111111111111', 'StatementDesk', 'PDF bank statement converter for UK accountants. Converts PDF bank statements into clean spreadsheets for easy import into accounting software.', 'https://statementdesk.com'),
  ('22222222-2222-2222-2222-222222222222', 'Stash''d', 'Screenshot and idea organizer app. Save, tag, and organize screenshots, inspiration, and ideas in one searchable place.', 'https://stashd.app'),
  ('33333333-3333-3333-3333-333333333333', 'GenScript', 'YouTube script generation tool. Generate engaging YouTube video scripts with AI, including hooks, structure, and CTAs.', 'https://genscript.ai'),
  ('44444444-4444-4444-4444-444444444444', 'ScamShield', 'Chrome extension for crypto scam detection. Detects and warns about potential crypto scams, pig butchering schemes, and fraudulent investment sites in real-time.', 'https://scamshield.io'),
  ('55555555-5555-5555-5555-555555555555', 'FlipChecker', 'Facebook to eBay reseller arbitrage tool. Instantly check if items on Facebook Marketplace are profitable to flip on eBay.', 'https://flipchecker.com'),
  ('66666666-6666-6666-6666-666666666666', 'Reelytics', 'Short form video drama series analytics SaaS. Track performance analytics for short-form video series across TikTok, Reels, and Shorts.', 'https://reelytics.io'),
  ('77777777-7777-7777-7777-777777777777', 'ReachAI', 'AI agent that qualifies leads and books sales calls via Instagram DMs. Automates lead qualification and meeting booking through natural Instagram conversations.', 'https://reachai.co');

-- Insert keyword configs for each product
insert into keyword_configs (product_id, subreddits, keywords) values
  ('11111111-1111-1111-1111-111111111111',
   ARRAY['Accounting', 'UKPersonalFinance', 'bookkeeping', 'smallbusiness'],
   ARRAY['bank statement PDF', 'convert bank statement', 'import transactions', 'PDF to excel bank', 'bank statement converter']),

  ('22222222-2222-2222-2222-222222222222',
   ARRAY['productivity', 'Notion', 'PKMS', 'nocode', 'selfhosted'],
   ARRAY['organize screenshots', 'save ideas app', 'screenshot organizer', 'save inspiration', 'collect references']),

  ('33333333-3333-3333-3333-333333333333',
   ARRAY['NewTubers', 'youtube', 'contentcreation', 'videography'],
   ARRAY['youtube script', 'write scripts faster', 'script generator', 'scripting youtube', 'video script tool']),

  ('44444444-4444-4444-4444-444444444444',
   ARRAY['CryptoCurrency', 'Scams', 'antiMLM', 'PersonalFinance'],
   ARRAY['crypto scam', 'pig butchering', 'romance scam', 'investment scam', 'got scammed crypto']),

  ('55555555-5555-5555-5555-555555555555',
   ARRAY['Flipping', 'Ebay', 'FacebookMarketplace', 'reselling', 'sidehustle'],
   ARRAY['facebook to ebay', 'resell arbitrage', 'flip marketplace', 'reselling tool', 'price check resell']),

  ('66666666-6666-6666-6666-666666666666',
   ARRAY['NewTubers', 'TikTokTips', 'InstagramMarketing', 'videography', 'Entrepreneur'],
   ARRAY['short form analytics', 'reels analytics', 'tiktok series', 'video series analytics', 'track reels']),

  ('77777777-7777-7777-7777-777777777777',
   ARRAY['Entrepreneur', 'smallbusiness', 'sales', 'Instagram', 'leads'],
   ARRAY['qualify leads instagram', 'DM automation', 'book calls instagram', 'instagram sales', 'automate instagram DMs']);
