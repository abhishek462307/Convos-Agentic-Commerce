import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api-auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { feature_request_id } = await req.json()

  if (!feature_request_id) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('feature_request_votes')
    .select('id')
    .eq('feature_request_id', feature_request_id)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    await supabase.from('feature_request_votes').delete().eq('id', existing.id)
    const { data: fr } = await supabase.from('feature_requests').select('upvotes').eq('id', feature_request_id).single()
    await supabase.from('feature_requests').update({ upvotes: Math.max(0, (fr?.upvotes || 1) - 1) }).eq('id', feature_request_id)
    return NextResponse.json({ voted: false })
  } else {
    await supabase.from('feature_request_votes').insert({ feature_request_id, user_id: user.id })
    const { data: fr } = await supabase.from('feature_requests').select('upvotes').eq('id', feature_request_id).single()
    await supabase.from('feature_requests').update({ upvotes: (fr?.upvotes || 0) + 1 }).eq('id', feature_request_id)
    return NextResponse.json({ voted: true })
  }
}
