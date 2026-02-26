import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const grantId = formData.get('grantId') as string

    if (!file || !grantId) {
      return NextResponse.json({ error: 'Missing file or grant ID' }, { status: 400 })
    }

    // Upload to Supabase Storage
    const fileName = `${grantId}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabaseAdmin.storage
      .from('grant-documents')
      .upload(fileName, file)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Store file path only — NOT a public URL
    const { error: dbError } = await supabaseAdmin
      .from('grant_documents')
      .insert({
        grant_id: grantId,
        document_type: 'supporting_doc',
        document_url: fileName, // store path, not public URL
        file_name: file.name,
        file_size: file.size,
      })

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, path: fileName })
  } catch (error: any) {
    console.error('Document upload error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}