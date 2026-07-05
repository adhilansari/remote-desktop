import sys
from PIL import Image

def make_square_icon():
    # Load the cropped transparent logo
    input_path = "logo.png"
    img = Image.open(input_path)
    
    # Target size for Mac icons (1024x1024 is standard for high-res)
    size = 1024
    
    # Calculate scaling to fit within the square with some padding (e.g., 10% padding)
    padding = int(size * 0.1)
    available_size = size - (2 * padding)
    
    # Calculate scale factor
    scale = min(available_size / img.width, available_size / img.height)
    new_width = int(img.width * scale)
    new_height = int(img.height * scale)
    
    # Resize the image
    img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    # Create a new transparent square image
    square_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    
    # Paste the resized image into the center
    offset_x = (size - new_width) // 2
    offset_y = (size - new_height) // 2
    square_img.paste(img, (offset_x, offset_y), img)
    
    # Save the square icon back to build/icon.png
    square_img.save("keenfresh-desktop/build/icon.png")
    
    # Also save as icns directly if possible, or just let electron-builder do it.
    # electron-builder will generate icns from a 1024x1024 icon.png automatically.
    print("Created perfectly square 1024x1024 icon.png for Mac/Linux!")

if __name__ == "__main__":
    make_square_icon()
