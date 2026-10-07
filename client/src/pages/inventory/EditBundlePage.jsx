import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MotionHeader } from '@/components/shared/MotionReveal'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { useProducts } from '@/hooks/useProducts'
import { PRODUCT_TYPES } from '@/lib/mapProduct'
import { PATHS } from '@/router/paths'
import { BundleFormPage } from '@/pages/inventory/BundleFormPage'

// Inventory Manager → Products → Edit Bundle (same UI as Add, recipe locked)
export function EditBundlePage() {
  const { id } = useParams()
  const { fetchProductDetail } = useProducts({}, { skipList: true })
  const [bundle, setBundle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return undefined
    let cancelled = false
    setLoading(true)
    setError('')
    void fetchProductDetail(id).then((result) => {
      if (cancelled) return
      setLoading(false)
      if (!result.success || !result.data) {
        setError(result.error || 'Bundle not found')
        setBundle(null)
        return
      }
      if (result.data.type !== PRODUCT_TYPES.BUNDLE) {
        setError('This product is not a bundle.')
        setBundle(null)
        return
      }
      setBundle(result.data)
    })
    return () => {
      cancelled = true
    }
  }, [id, fetchProductDetail])

  if (error) {
    return (
      <div className="space-y-5 pb-8">
        <MotionHeader>
          <PageHeader
            eyebrow="Inventory Manager"
            title="Edit Bundle"
            description={error}
            actions={
              <Button type="button" variant="outline" asChild>
                <Link to={PATHS.inventory.products}>Back to products</Link>
              </Button>
            }
          />
        </MotionHeader>
      </div>
    )
  }

  return (
    <BundleFormPage mode="edit" initialBundle={bundle} loadingDetail={loading || !bundle} />
  )
}

export default EditBundlePage
