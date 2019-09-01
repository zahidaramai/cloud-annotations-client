import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { connect } from 'react-redux'

import ImageTileV3 from 'common/ImageTile/ImageTileV3'
import LayersPanel from './LayersPanel'
import ImagesPanel from './ImagesPanel'
import DefaultLayout from './DefaultLayout'
import ToolsPanel from './ToolsPanel'
import ToolOptionsPanel from './ToolOptionsPanel'
import fetchImage from 'api/fetchImage'
import DrawingPanel from './DrawingPanel'
import { endpointForLocationConstraint } from 'endpoints'
import { setActiveImage } from 'redux/editor'

const EMPTY_IMAGE =
  'data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

const useImage = (endpoint, bucket, image) => {
  const [imageData, setImageData] = useState(EMPTY_IMAGE)
  useEffect(() => {
    let canceled = false
    let loaded = false

    const loadImage = async image => {
      const imageData = await fetchImage(endpoint, bucket, image, false)
      if (!canceled) {
        loaded = true
        setImageData(imageData.image)
      }
    }

    // If the image hasn't loaded after 20ms it probably isn't cached, so set it
    // to an empty image. This prevents flickering if the image is cached, but
    // wipes the image fast enough if it's not cached.
    setTimeout(() => {
      if (!loaded) {
        setImageData(EMPTY_IMAGE)
      }
    }, 20)

    loadImage(image)

    return () => {
      canceled = true
    }
  }, [endpoint, bucket, image])

  return imageData
}

const Localization = ({
  bucket,
  location,
  collection,
  activeImage,
  setActiveImage
}) => {
  // const [selectedImage, setSelectedImage] = useState(undefined)
  const [imageFilter, setImageFilter] = useState(undefined)

  const images =
    imageFilter === undefined
      ? collection.images
      : collection.getLabeledImages(imageFilter)

  const handleImageFilterChange = useCallback(e => {
    switch (e.target.value) {
      case 'all':
        setImageFilter(undefined)
        break
      case 'labeled':
        setImageFilter(true)
        break
      case 'unlabeled':
        setImageFilter(false)
        break
      default:
        break
    }
  }, [])

  const handleSelectionChanged = useCallback(
    selection => {
      setActiveImage(images[selection])
    },
    [images, setActiveImage]
  )

  useEffect(() => {
    setActiveImage(activeImage || images[0])
  }, [activeImage, images, setActiveImage])

  const selectedIndex = images.indexOf(activeImage)

  const bboxes = collection.annotations[activeImage] || []

  const endpoint = endpointForLocationConstraint(location)
  const imageData = useImage(endpoint, bucket, activeImage)

  const cells = useMemo(() => {
    return images.map(image => (
      <ImageTileV3 endpoint={endpoint} bucket={bucket} item={image} />
    ))
  }, [endpoint, bucket, images])

  const mapOfLabelCount = collection.getLabelMapCount()

  return (
    <DefaultLayout
      top={<ToolOptionsPanel />}
      left={<ToolsPanel />}
      content={<DrawingPanel selectedImage={activeImage} image={imageData} />}
      right={
        <LayersPanel
          imageName={activeImage}
          bboxes={bboxes}
          image={imageData}
        />
      }
      bottom={
        <ImagesPanel
          images={images}
          labels={mapOfLabelCount}
          handleImageFilterChange={handleImageFilterChange}
          cells={cells}
          selectedIndex={selectedIndex}
          handleSelectionChanged={handleSelectionChanged}
        />
      }
    />
  )
}

const mapStateToProps = state => ({
  collection: state.collection,
  activeImage: state.editor.image
})

const mapDispatchToProps = {
  setActiveImage
}
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Localization)
