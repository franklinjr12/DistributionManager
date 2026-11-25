import { useNavigate } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Button, Card, EmptyState } from '@/components/ui'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <Card>
      <EmptyState
        icon={<Compass />}
        title="Página não encontrada"
        description="O endereço acessado não existe nesta demonstração."
        action={<Button onClick={() => navigate('/')}>Voltar ao Painel ROI</Button>}
      />
    </Card>
  )
}
