import { text } from "svelte/internal";
import { MeshBasicMaterial, RepeatWrapping, Texture } from "three";

export function getClippedRegion(image, x, y, width, height) {

    var canvas = document.createElement('canvas'),
        ctx = canvas.getContext('2d');

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(image, -x, -y, image.width, image.height);

    return canvas;
}

export const createSlicedTextures = (fileName: string, slices: number, width: number, height: number, isStatic: boolean = false) => {
    const images = []
    const sliceSize = height / slices

    let textures = []

    for (let i = 0; i < 6; i++) {
        textures[i] = new Texture()
    }

    const image = new Image(width, height)

    image.onload = () => {

        for (let i = 0; i < slices; i++) {            
            const region = getClippedRegion(image, 0, sliceSize * i, sliceSize, sliceSize)

            images.push(region)
        }

        for (let i = 0; i < 6; i++) {
            if (isStatic) {
                textures[i].image = images[2]
            } else {
                textures[i].image = i === 2 ? images[0] : images[1]
            }
            textures[i].wrapS = RepeatWrapping
            textures[i].wrapT = RepeatWrapping
            textures[i].repeat.set(1, 1)
            textures[i].needsUpdate = true
        }
    }

    image.src = fileName

    return textures.map(texture => new MeshBasicMaterial({ map: texture }))
}