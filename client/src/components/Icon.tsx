import { Image, View } from '@tarojs/components'
import clearIcon from '../assets/icons/clear.png'
import deleteIcon from '../assets/icons/delete.png'
import editIcon from '../assets/icons/edit.png'
import refreshIcon from '../assets/icons/refresh.png'

interface IconProps {
  name:
    | 'record'
    | 'history'
    | 'opponents'
    | 'insight'
    | 'chevron-right'
    | 'edit'
    | 'clear'
    | 'delete'
    | 'refresh'
  size?: number
  color?: string
  className?: string
}

export default function Icon(props: IconProps) {
  const { name, size = 24, color = '#9AA4B2', className = '' } = props

  const img = (src: any) => (
    <Image className={`icon ${className}`} src={src} mode="aspectFit" style={{ width: `${size}px`, height: `${size}px` }} />
  )

  if (name === 'record') {
    return (
      <View className={`icon ${className}`} style={{ width: `${size}px`, height: `${size}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24">
          <g fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
            <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2m4 7h4m-4 5h4m-8-5h.01M8 16h.01"/>
          </g>
        </svg>
      </View>
    )
  }

  if (name === 'history') {
    return (
      <View className={`icon ${className}`} style={{ width: `${size}px`, height: `${size}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24">
          <g fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9a9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5m4-1v5l4 2"/>
          </g>
        </svg>
      </View>
    )
  }

  if (name === 'opponents') {
    return (
      <View className={`icon ${className}`} style={{ width: `${size}px`, height: `${size}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24">
          <g fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3.128a4 4 0 0 1 0 7.744M22 21v-2a4 4 0 0 0-3-3.87"/>
            <circle cx="9" cy="7" r="4"/>
          </g>
        </svg>
      </View>
    )
  }

  if (name === 'insight') {
    return (
      <View className={`icon ${className}`} style={{ width: `${size}px`, height: `${size}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24">
          <path fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3v18h18m-3-4V9m-5 8V5M8 17v-3"/>
        </svg>
      </View>
    )
  }

  if (name === 'chevron-right') {
    const w = Math.max(10, Math.floor(size * 0.55))
    const h = Math.max(2, Math.floor(size * 0.12))
    return (
      <View className={`icon ${className}`} style={{ width: `${size}px`, height: `${size}px`, position: 'relative' }}>
        <View style={{ position: 'absolute', left: '50%', top: '50%', width: `${w}px`, height: `${h}px`, background: color, borderRadius: '999px', transform: `translate(-40%,-50%) rotate(45deg)`, transformOrigin: 'center' }} />
        <View style={{ position: 'absolute', left: '50%', top: '50%', width: `${w}px`, height: `${h}px`, background: color, borderRadius: '999px', transform: `translate(-40%,-50%) rotate(-45deg)`, transformOrigin: 'center' }} />
      </View>
    )
  }

  if (name === 'edit') {
    return img(editIcon)
  }

  if (name === 'clear') {
    return img(clearIcon)
  }

  if (name === 'refresh') {
    return img(refreshIcon)
  }

  if (name === 'delete') {
    return img(deleteIcon)
  }

  return null
}
