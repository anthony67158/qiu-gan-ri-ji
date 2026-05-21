import { View } from '@tarojs/components'

export default function Skeleton(props: { style?: any; className?: string }) {
  const cls = ['skeleton', props.className || 'skeletonLine'].filter(Boolean).join(' ')
  return <View className={cls} style={props.style} />
}

