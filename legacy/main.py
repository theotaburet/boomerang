
### main.py
```python
import cv2
import numpy as np
import os
import argparse

def resize_image(image, max_width):
    # Calculate the aspect ratio
    aspect_ratio = max_width / float(image.shape[1])
    
    # Calculate the new height using the aspect ratio
    new_height = int(image.shape[0] * aspect_ratio)
    
    # Resize the image
    resized_image = cv2.resize(image, (max_width, new_height), interpolation=cv2.INTER_LANCZOS4)
    
    return resized_image

def add_margin_and_make_square(image, max_width=1080):
    # Get image dimensions
    height, width, layers = image.shape

    # Calculate the amount of margin to be added
    margin = int(max(height, width) * 0.05)

    # Create a square canvas with dimensions based on the larger dimension plus margin
    if height > width:
        square_size = height + 2 * margin
        top, bottom = margin, margin
        left = (height - width) // 2 + margin
        right = (height - width) // 2 + margin
    else:
        square_size = width + 2 * margin
        left, right = margin, margin
        top = (width - height) // 2 + margin
        bottom = (width - height) // 2 + margin

    # Create a new canvas with the square size
    square_canvas = cv2.copyMakeBorder(image, top, bottom, left, right, cv2.BORDER_CONSTANT, value=(255, 255, 255))

    # Resize
    square_canvas = resize_image(square_canvas, max_width)

    return square_canvas

def main(imgs_path, fps, output, duration, max_width):
    images = sorted([img for img in os.listdir(imgs_path) if img.endswith((".JPG", ".jpg"))])
    frame = add_margin_and_make_square(cv2.imread(os.path.join(imgs_path, images[0])), max_width)
    height, width, layers = frame.shape

    fourcc = cv2.VideoWriter_fourcc(*'avc1')
    video = cv2.VideoWriter(output, fourcc, fps, (width, height))

    # Create a sequence for alternating between images
    sequence = images + images[-2:0:-1]

    # Calculate the number of times to repeat the image sequence to fill the desired duration
    repetitions = int(duration * fps // len(sequence))

    # Write the image sequence to the video file ensuring no consecutive repetition
    for _ in range(repetitions):
        for image in sequence:
            video.write(add_margin_and_make_square(cv2.imread(os.path.join(imgs_path, image)), max_width))

    cv2.destroyAllWindows()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Convert images to a looped video with added margins and resizing.')
    parser.add_argument('--imgs_path', type=str, required=True, help='Path to the folder containing the images.')
    parser.add_argument('--fps', type=int, required=True, help='Frames per second for the output video.')
    parser.add_argument('--output', type=str, required=True, help='Name of the output video file.')
    parser.add_argument('--duration', type=int, default=15, help='Desired duration of the video in seconds.')
    parser.add_argument('--max_width', type=int, default=1080, help='Maximum width for resizing the images.')

    args = parser.parse_args()
    main(args.imgs_path, args.fps, args.output, args.duration, args.max_width)
