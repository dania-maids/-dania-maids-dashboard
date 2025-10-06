import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, full_name, role, phone } = body

    // إنشاء المستخدم
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name
      }
    })

    if (authError) throw authError

    // تحديث role و phone
    if (authData.user) {
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          role: role || 'staff',
          phone: phone || null
        })
        .eq('id', authData.user.id)

      if (updateError) throw updateError
    }

    return NextResponse.json({ success: true, user: authData.user })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}