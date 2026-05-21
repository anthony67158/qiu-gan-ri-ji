import { Button } from '@tarojs/components'

export type ButtonProps = {
  key?: any
  children?: any
  variant?: 'default' | 'secondary' | 'ghost' | 'destructive'
  size?: 'default' | 'sm'
  disabled?: boolean
  loading?: boolean
  onClick?: (e?: any) => void
  style?: any
  className?: string
  hoverClass?: string
}

export function ButtonUI(props: ButtonProps) {
  const v = props.variant || 'default'
  const s = props.size || 'default'
  const base =
    v === 'default' ? 'btnPrimary' : v === 'ghost' ? 'btnGhost' : v === 'destructive' ? 'btnMuted' : 'btnMuted'
  const tech = props.loading ? 'btnTechLoading' : ''
  const cls = [base, tech, s === 'sm' ? 'btnMini' : '', props.className || ''].filter(Boolean).join(' ')
  return (
    <Button
      className={cls}
      hoverClass={props.hoverClass || 'btnHover'}
      disabled={props.disabled || props.loading}
      loading={props.loading}
      onClick={props.onClick}
      style={props.style}
    >
      {props.children}
    </Button>
  )
}

export default ButtonUI
