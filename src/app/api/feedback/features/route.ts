import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api-auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)

  const { data, error } = await supabase
    .from('feature_requests')
    .select('*')
    .order('upvotes', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (user) {
    const { data: votes } = await supabase
      .from('feature_request_votes')
      .select('feature_request_id')
      .eq('user_id', user.id)

    const votedIds = new Set(votes?.map(v => v.feature_request_id) || [])
    const enriched = data?.map(f => ({ ...f, has_voted: votedIds.has(f.id) }))
    return NextResponse.json(enriched)
  }

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { title, description } = body

  if (!title || !description) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('feature_requests')
    .insert({ user_id: user.id, title, description })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
