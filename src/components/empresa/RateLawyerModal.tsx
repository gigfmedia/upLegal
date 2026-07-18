import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Star, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createCompanyRating } from '@/services/empresaRatingService'
import { toast } from 'sonner'

interface RateLawyerModalProps {
  isOpen: boolean
  onClose: () => void
  requestId: string
  lawyerId: string
  lawyerName: string
  onRated: () => void
}

export function RateLawyerModal({ isOpen, onClose, requestId, lawyerId, lawyerName, onRated }: RateLawyerModalProps) {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Selecciona una calificación')
      return
    }

    setIsSubmitting(true)
    try {
      await createCompanyRating({
        requestId,
        lawyerId,
        rating,
        comment: comment.trim() || undefined,
      })
      toast.success('Calificación enviada')
      onRated()
      handleClose()
    } catch (err: any) {
      toast.error(err.message || 'Error al enviar calificación')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setRating(0)
    setHoveredRating(0)
    setComment('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Calificar abogado</DialogTitle>
          <DialogDescription>
            Evalúa tu experiencia con {lawyerName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Calificación
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  onMouseEnter={() => setHoveredRating(value)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 rounded"
                >
                  <Star
                    className={cn(
                      'h-10 w-10 transition-colors',
                      (hoveredRating >= value || rating >= value)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'fill-gray-200 text-gray-200'
                    )}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm font-medium text-gray-700">
                  {rating === 5 && 'Excelente'}
                  {rating === 4 && 'Muy bueno'}
                  {rating === 3 && 'Bueno'}
                  {rating === 2 && 'Regular'}
                  {rating === 1 && 'Malo'}
                </span>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
              Comentario (opcional)
            </label>
            <Textarea
              id="comment"
              placeholder="Cuéntanos cómo fue tu experiencia con este abogado..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="resize-none"
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">{comment.length}/500 caracteres</p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || rating === 0} className="bg-gray-900 hover:bg-green-900">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar calificación'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
