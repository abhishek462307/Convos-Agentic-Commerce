import { ImageResponse } from 'next/og'

// Route segment config
export const runtime = 'edge'

// Image metadata
export const alt = 'Convos'
export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      // ImageResponse CSR elements
      <div
        style={{
          background: 'black',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '40px',
          overflow: 'hidden',
        }}
      >
        <img
          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/8ad9f8e5-1e3a-43be-a9f6-ec74728aef3e/apple-touch-icon-1768612102177.png?width=256&height=256&resize=contain"
          width="100%"
          height="100%"
        />
      </div>
    ),
    {
      ...size,
    }
  )
}
