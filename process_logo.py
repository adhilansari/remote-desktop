import sys
import subprocess

def install_and_run():
    print("Installing rembg and Pillow if needed...")
    try:
        import rembg
    except ImportError:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "rembg", "Pillow"])
        import rembg

    from PIL import Image
    import io

    input_path = r"C:\Users\adhil\.gemini\antigravity\brain\fad898e9-513b-434e-9d96-301308c22f20\keenfresh_pro_logo_1783272567200.png"
    output_path = r"C:\Users\adhil\OneDrive\Desktop\remote-desktop\logo.png"

    print("Removing background...")
    with open(input_path, 'rb') as i:
        input_data = i.read()
        output_data = rembg.remove(input_data)

    # Open the image from the output data
    img = Image.open(io.BytesIO(output_data))

    print("Cropping whitespace...")
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    
    # Save the final image (replaces the old logo.png in the project root)
    img.save(output_path)
    
    print("Creating icon.ico for Desktop App...")
    ico_path = r"C:\Users\adhil\OneDrive\Desktop\remote-desktop\keenfresh-desktop\build\icon.ico"
    img.save(ico_path, format='ICO', sizes=[(256, 256)])
    print("Success!")

install_and_run()
