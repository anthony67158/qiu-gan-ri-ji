import { View } from '@tarojs/components'
import Input from './input'
import Button from './button'

export default function SearchBar(props: {
  value: string
  placeholder?: string
  onChange: (v: string) => void
  onSubmit?: () => void
}) {
  return (
    <View className="searchBar">
      <Input value={props.value} placeholder={props.placeholder || '搜索...'} onInput={(e: any) => props.onChange(e.detail.value)} style={{ flex: 1 }} />
      <Button variant="ghost" size="sm" onClick={props.onSubmit}>
        搜索
      </Button>
    </View>
  )
}

