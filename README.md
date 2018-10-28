# Mandelbrot Set Viewer using Canvas and Worker API

This project explores the [Mandelbrot Set](https://en.wikipedia.org/wiki/Mandelbrot_set) using the Canvas and [Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) APIs.  The visualization is colorized by normalizing the iteration count and using a [monotone cubic interpolation function](https://en.wikipedia.org/wiki/Monotone_cubic_interpolation) to generate a smooth color gradient from 5 anchor points.

![Mandelbrot Image](https://github.com/popnfresh234/mandelbrot_threaded/blob/master/docs/screen_shot.png)

### Getting started

Clone the project
`git clone https://github.com/popnfresh234/mandelbrot_threaded`

Install required node modules
`npm install`

Start the webpack development server to run the project locally
`npm start`

To build the project for distribution
`npm run build`

### Acknowledgements
[This post on StackOverflow](https://stackoverflow.com/a/25816111/7405709) was very helpful with regards to smooth coloring of the visualization