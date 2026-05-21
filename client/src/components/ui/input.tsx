import { Input } from '@tarojs/components'

export type InputProps = {
  value?: string
  placeholder?: string
  disabled?: boolean
  onInput?: (e: any) => void
  onFocus?: (e: any) => void
  onBlur?: (e: any) => void
  style?: any
  className?: string
  type?: 'text' | 'number'
}

export default function InputUI(props: InputProps) {
  const cls = ['input', props.className || ''].filter(Boolean).join(' ')
  return (
    <Input
      value={props.value}
      placeholder={props.placeholder}
      disabled={props.disabled}
      onInput={props.onInput}
      onFocus={props.onFocus}
      onBlur={props.onBlur}
      className={cls}
      style={props.style}
      type={props.type || 'text'}
    />
  )
}
