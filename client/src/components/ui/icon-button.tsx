import { View } from '@tarojs/components'
import Icon from '@/components/Icon'

export default function IconButton(props: {
  icon: 'edit' | 'clear' | 'delete' | 'refresh'
  variant?: 'default' | 'secondary' | 'ghost' | 'destructive'
  disabled?: boolean
  onClick?: (e?: any) => void
  className?: string
  style?: any
  size?: number
  color?: string
}) {
  const v = props.variant || 'ghost'
  const base =
    v === 'default' ? 'btnPrimary' : v === 'ghost' ? 'btnGhost' : v === 'destructive' ? 'btnMuted' : 'btnMuted'
  const cls = [base, 'btnMini', 'iconBtn', props.className || ''].filter(Boolean).join(' ')
  const disabled = Boolean(props.disabled)
  return (
    <View
      className={cls}
      hoverClass={disabled ? '' : 'btnHover'}
      onClick={disabled ? undefined : props.onClick}
      style={{ ...(props.style || {}), opacity: disabled ? 0.55 : 1 }}
    >
      <Icon name={props.icon} size={props.size || 16} color={props.color || '#E5E7EB'} />
    </View>
  )
}

