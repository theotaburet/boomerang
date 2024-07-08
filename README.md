# Images to Video Converter

This script converts a series of images into a video with added margins to make each image square and resizes the output to a specified width. 

## Features

- Resizes images to a specified maximum width.
- Adds margins to make the images square.
- Converts images to a video file with a specified duration and frames per second (fps).

## Requirements

- Python 3.x
- OpenCV
- NumPy

## Installation

```bash
pip install opencv numpy
```

## Usage
```bash
python main.py --imgs_path "path/to/images" --fps 15 --output "out.mp4" --duration 15 --max_width 1080
```

Arguments
  + --imgs_path: Path to the folder containing the images.
  + --fps: Frames per second for the output video.
  + --output: Name of the output video file.
  + --duration: Desired duration of the video in seconds.
  + --max_width: Maximum width for resizing the images. Default is 1080.


### Example
```bash
python main.py --imgs_path "data/imgs" --fps 15 --output "out.mp4" --duration 15 --max_width 1080
```

### License
This project is licensed under the MIT License.
