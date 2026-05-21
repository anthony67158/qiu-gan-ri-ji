import { DoublesPartnerProfile, TagStat } from '../../../shared/types'
import { listMatches } from '../match/match.service'

function buildTagStats(values: string[]): TagStat[] {
  const counts = new Map<string, number>()
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1)
  const total = values.length || 1
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count, ratio: count / total }))
    .sort((a, b) => b.count - a.count)
}

export async function listDoublesPartners(userId: string): Promise<DoublesPartnerProfile[]> {
  const matches = await listMatches(userId, 1000, 0)
  const doubles = matches.filter(m => (m.match_type === 'DOUBLE' || m.match_type === 'doubles') && m.doubles_data?.partner_name_alias)
  const grouped = new Map<string, typeof doubles>()
  for (const m of doubles) {
    const key = m.doubles_data?.partner_name_alias || '未知搭档'
    grouped.set(key, [...(grouped.get(key) || []), m])
  }

  const result: DoublesPartnerProfile[] = []
  for (const [name, list] of grouped.entries()) {
    const wins = list.filter(m => m.match_result === 'WIN').length
    const losses = list.filter(m => m.match_result === 'LOSE').length
    const total = list.length
    const win_rate = total === 0 ? 0 : wins / total
    const tactics = buildTagStats(list.flatMap(m => m.tactics_used_tags || []))
    const lastMatchDate = list.map(m => new Date(m.updated_at)).sort((a, b) => b.getTime() - a.getTime())[0] || null
    result.push({
      partner_name_alias: name,
      total_matches: total,
      wins,
      losses,
      win_rate,
      tactics_together: tactics,
      last_match_date: lastMatchDate ? lastMatchDate.toISOString() : null
    })
  }
  return result.sort((a, b) => b.total_matches - a.total_matches)
}

export async function getDoublesPartnerDetail(userId: string, partnerName: string) {
  const all = await listDoublesPartners(userId)
  return all.find(p => p.partner_name_alias === partnerName) || null
}
