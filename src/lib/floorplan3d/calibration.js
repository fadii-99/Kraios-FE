/** Convert a click on the rendered drawing to the pipeline's page pixels. */
export function drawingPointFromClick(event, pageWidth, pageHeight) {
  const image = event.currentTarget.querySelector('img')
  const rect = image?.getBoundingClientRect()
  if (!rect?.width || !rect.height || !pageWidth || !pageHeight) return null
  return {
    x: ((event.clientX - rect.left) / rect.width) * pageWidth,
    y: ((event.clientY - rect.top) / rect.height) * pageHeight,
  }
}
