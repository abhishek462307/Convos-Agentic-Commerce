import { NextResponse } from 'next/server';
import { authorizeMigrationRequest } from '@/lib/migration-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  const auth = await authorizeMigrationRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const results: Record<string, string> = {};

  const statements = [
    {
      name: 'enable_pgvector',
      sql: `CREATE EXTENSION IF NOT EXISTS vector;`
    },
    {
      name: 'add_embedding_column',
      sql: `ALTER TABLE products ADD COLUMN IF NOT EXISTS embedding vector(1536);`
    },
    {
      name: 'create_hnsw_index',
      sql: `CREATE INDEX IF NOT EXISTS products_embedding_idx ON products USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);`
    },
    {
      name: 'add_search_text_column',
      sql: `ALTER TABLE products ADD COLUMN IF NOT EXISTS search_text tsvector;`
    },
    {
      name: 'create_search_text_index',
      sql: `CREATE INDEX IF NOT EXISTS products_search_text_idx ON products USING gin (search_text);`
    },
    {
      name: 'create_search_text_trigger_fn',
      sql: `CREATE OR REPLACE FUNCTION products_search_text_trigger() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN NEW.search_text := to_tsvector(''english'', coalesce(NEW.name,'''') || '' '' || coalesce(NEW.category,'''') || '' '' || coalesce(NEW.description,'''')); RETURN NEW; END;';`
    },
    {
      name: 'create_search_text_trigger',
      sql: `DROP TRIGGER IF EXISTS trg_products_search_text ON products; CREATE TRIGGER trg_products_search_text BEFORE INSERT OR UPDATE OF name, description, category ON products FOR EACH ROW EXECUTE FUNCTION products_search_text_trigger();`
    },
    {
      name: 'create_match_products_function',
      sql: `CREATE OR REPLACE FUNCTION match_products(query_embedding vector(1536), match_merchant_id uuid, match_threshold float DEFAULT 0.3, match_count int DEFAULT 20) RETURNS TABLE (id uuid, name text, description text, price numeric, category text, image_url text, stock_quantity int, bargain_enabled boolean, bargain_min_price numeric, similarity float) LANGUAGE sql STABLE AS 'SELECT p.id, p.name, p.description, p.price, p.category, p.image_url, p.stock_quantity, p.bargain_enabled, p.bargain_min_price, 1 - (p.embedding <=> query_embedding) AS similarity FROM products p WHERE p.merchant_id = match_merchant_id AND p.embedding IS NOT NULL AND 1 - (p.embedding <=> query_embedding) > match_threshold ORDER BY p.embedding <=> query_embedding ASC LIMIT match_count';`
    }
  ];

  for (const stmt of statements) {
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql_query: stmt.sql });
    results[stmt.name] = error ? `ERROR: ${error.message}` : 'OK';
  }

  return NextResponse.json({ results });
}
