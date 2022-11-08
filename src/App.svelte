<script lang="ts">
  import { onMount } from "svelte";
  import { createScene, updateColor, updateGrid } from "./scene";
  import "./app.css";
  import { writable } from "svelte/store";
  import JSONTree from 'svelte-json-tree';

  let el
  let tiles = writable(32)
  let color = writable('#ff0000')
  let coordinates = {
    x: 0,
    y: 0,
    z: 0,
  }

  onMount(() => {
    createScene(el, $tiles);
    registerListeners()

    document.addEventListener('gridhover', (e) => {
      coordinates = { x: e.detail.coordinates.x, y: e.detail.coordinates.y, z: e.detail.coordinates.z }
    })
  });

  const registerListeners = () => {
    tiles.subscribe(value => {
      updateGrid(value)
    })

    color.subscribe(value => {
      updateColor(value)
    })


  }

</script>

<div class="application">
  <div class="coordinates-box">
    { coordinates.x } | { coordinates.y } | { coordinates.z }
  </div>
  <div class="gui">
    <div class="flex">
      <div>Size</div>
      <input type="number" bind:value={$tiles} />
    </div>
    <div class="flex">
      <div>Color</div>
      <input type="color" bind:value={$color}>
    </div>
    <div class="tree" style="--json-tree-symbol-color: blue;">
      <JSONTree bind:value={coordinates} />
    </div>
  </div>
  <canvas class="render-target" bind:this={el} />
</div>
