import { View } from '@tarojs/components'

export type BadgeProps = {
  key?: any
  children?: any
  variant?: 'default' | 'secondary' | 'success' | 'destructive' | 'practice'
  className?: string
  style?: any
}

export default function Badge(props: BadgeProps) {
  const v = props.variant || 'default'
  const base =
    v === 'success'
      ? 'pill pillWin'
      : v === 'destructive'
        ? 'pill pillLose'
        : v === 'practice'
          ? 'pill pillPractice'
          : 'pill pillNeutral'
  const cls = [base, props.className || ''].filter(Boolean).join(' ')
  return (
    <View className={cls} style={props.style}>
      {props.children}
    </View>
  )
}
