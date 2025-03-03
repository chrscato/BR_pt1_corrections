"""
PDF utilities for handling PDF files and extracting regions.
"""
import fitz  # PyMuPDF
import base64
from pathlib import Path
import config
from text_utils import validate_filename
import os
import logging

# Configure basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_pdf_path(filename):
    """
    Get the full path to a PDF file.
    
    Args:
        filename (str): The JSON filename 
        
    Returns:
        Path: Path to the corresponding PDF file
    """
    logger.info(f"Getting PDF path for filename: {filename}")
    safe_filename = validate_filename(filename)
    logger.info(f"Validated filename: {safe_filename}")
    
    # Handle file extension
    if safe_filename.lower().endswith('.json'):
        pdf_filename = Path(safe_filename).with_suffix('.pdf')
    else:
        pdf_filename = Path(safe_filename).with_suffix('.pdf')
    
    logger.info(f"PDF filename: {pdf_filename}")
    pdf_path = config.FOLDERS['PDF_FOLDER'] / pdf_filename
    
    # Log the path for debugging
    logger.info(f"Looking for PDF: {pdf_path}")
    logger.info(f"PDF folder exists: {config.FOLDERS['PDF_FOLDER'].exists()}")
    
    # Check if file exists
    if not pdf_path.exists():
        logger.warning(f"PDF not found: {pdf_path}")
        
        # Try alternate naming patterns - sometimes PDF names don't exactly match JSON names
        base_name = Path(safe_filename).stem
        logger.info(f"Trying alternate names with base: {base_name}")
        alternate_paths = [
            config.FOLDERS['PDF_FOLDER'] / f"{base_name}.pdf",
            config.FOLDERS['PDF_FOLDER'] / f"{base_name.lower()}.pdf",
            config.FOLDERS['PDF_FOLDER'] / f"{base_name.upper()}.pdf"
        ]
        
        for alt_path in alternate_paths:
            logger.info(f"Checking alternate path: {alt_path}")
            if alt_path.exists():
                logger.info(f"Found alternate PDF: {alt_path}")
                return alt_path
        
        # Try listing files in the directory to see if any have similar names
        try:
            pdf_files = list(config.FOLDERS['PDF_FOLDER'].glob('*.pdf'))
            similar_files = [f.name for f in pdf_files if base_name.lower() in f.name.lower()]
            logger.info(f"Available PDFs with similar names: {similar_files}")
            
            # If we found similar files, try to use the first one
            if similar_files:
                similar_path = config.FOLDERS['PDF_FOLDER'] / similar_files[0]
                logger.info(f"Using similar PDF: {similar_path}")
                return similar_path
        except Exception as e:
            logger.error(f"Error listing PDF directory: {e}")
    else:
        logger.info(f"PDF found: {pdf_path}")
    
    return pdf_path

def extract_pdf_region(filename, region_name):
    """
    Extract a specific region from a PDF file as an image.
    
    Args:
        filename (str): The filename to process
        region_name (str): The region to extract ('header', 'service_lines', or 'footer')
        
    Returns:
        str: Base64-encoded image data as a data URL
    """
    # Validate inputs
    logger.info(f"Extracting region '{region_name}' from file '{filename}'")
    
    if region_name not in config.PDF_REGIONS:
        logger.error(f"Invalid region: {region_name}")
        raise ValueError(f"Invalid region: {region_name}")
    
    # Get PDF path
    pdf_path = get_pdf_path(filename)
    logger.info(f"PDF path resolved to: {pdf_path}")
    
    if not pdf_path.exists():
        logger.error(f"PDF file not found: {pdf_path}")
        # Return a placeholder image for "PDF not found"
        return f'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAAEsCAMAAABOo35HAAAAn1BMVEX///8AAADd3d3MzMypqalra2txcXF3d3eCgoKPj4+ampqmpqa5ubkQEBAgICAsLCw8PDxISEhQUFBYWFhnZ2dubm5/f3+IiIiQkJCYmJienp6lpaWwsLC9vb3Jycnr6+v19fUYGBgmJiY0NDRERERMTExiYmKDg4OLi4uTk5Obm5utra26urrDw8PQ0NDW1tbg4ODm5ub8/PwMDAwcHBzSAr3IAAAK2klEQVR42uzXgRpAQACGUW0qKrVNzVTM1Ps/m52xmXu/B+gA4GuFnzuVaqM9HsZsNfLDNpUz2k7m43Nx2vYhDWmVQBrSJnz6D0nfVHQ4R3RK15GNDSH7YAupSFvSPd/5ZiuHFKRUCVKQypCGNKQhDWlIQxrSkPaDNCqcTyENaVSSNKdxDZWQlskhDWk7pjpI47qVkIY0pCENaUhD2v+QRqVII8ZMSLA8TzA8TxA8zyWwPJeA8lwCyXMJIM8lYDzH4nkDCM+xOdw3Lp5jcbi3sXk+8+I5No+LjOY5Fod7N4rn2BQOFx3H8/YvcS7x7PU27V3GVe7nQGFQDAEEcM65nTbE1CbGDkNS4tAXDUKREYbUYsIUJi3A/7+m3q77LjQfrg+sdnb2p'
        
    try:
        # Open the PDF - Using a more direct approach similar to the working example
        logger.info(f"Opening PDF: {pdf_path}")
        try:
            doc = fitz.open(pdf_path)
            logger.info(f"PDF opened successfully. Page count: {doc.page_count}")
        except Exception as e:
            logger.error(f"Failed to open PDF: {e}")
            return f'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAAEsCAMAAABOo35HAAAAn1BMVEX///8AAADd3d3MzMypqalra2txcXF3d3eCgoKPj4+ampqmpqa5ubkQEBAgICAsLCw8PDxISEhQUFBYWFhnZ2dubm5/f3+IiIiQkJCYmJienp6lpaWwsLC9vb3Jycnr6+v19fUYGBgmJiY0NDRERERMTExiYmKDg4OLi4uTk5Obm5utra26urrDw8PQ0NDW1tbg4ODm5ub8/PwMDAwcHBzSAr3IAAAK2klEQVR42uzXgRpAQACGUW0qKrVNzVTM1Ps/m52xmXu/B+gA4GuFnzuVaqM9HsZsNfLDNpUz2k7m43Nx2vYhDWmVQBrSJnz6D0nfVHQ4R3RK15GNDSH7YAupSFvSPd/5ZiuHFKRUCVKQypCGNKQhDWlIQxrSkPaDNCqcTyENaVSSNKdxDZWQlskhDWk7pjpI47qVkIY0pCENaUhD2v+QRqVII8ZMSLA8TzA8TxA8zyWwPJeA8lwCyXMJIM8lYDzH4nkDCM+xOdw3Lp5jcbi3sXk+8+I5No+LjOY5Fod7N4rn2BQOFx3H8/YvcS7x7PU27V3GVe7nQGFQDAEEcM65nTbE1CbGDkNS4tAXDUKREYbUYsIUJi3A/7+m3q77LjQfrg+sdnb2p'
            
        if doc.page_count == 0:
            logger.error(f"PDF has no pages: {pdf_path}")
            raise ValueError(f"PDF has no pages: {pdf_path}")
            
        try:
            page = doc[0]  # Assuming we're working with the first page
            page_rect = page.rect
            logger.info(f"Page dimensions: {page_rect}")
        except Exception as e:
            logger.error(f"Failed to get page: {e}")
            return f'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAAEsCAMAAABOo35HAAAAn1BMVEX///8AAADd3d3MzMypqalra2txcXF3d3eCgoKPj4+ampqmpqa5ubkQEBAgICAsLCw8PDxISEhQUFBYWFhnZ2dubm5/f3+IiIiQkJCYmJienp6lpaWwsLC9vb3Jycnr6+v19fUYGBgmJiY0NDRERERMTExiYmKDg4OLi4uTk5Obm5utra26urrDw8PQ0NDW1tbg4ODm5ub8/PwMDAwcHBzSAr3IAAAK2klEQVR42uzXgRpAQACGUW0qKrVNzVTM1Ps/m52xmXu/B+gA4GuFnzuVaqM9HsZsNfLDNpUz2k7m43Nx2vYhDWmVQBrSJnz6D0nfVHQ4R3RK15GNDSH7YAupSFvSPd/5ZiuHFKRUCVKQypCGNKQhDWlIQxrSkPaDNCqcTyENaVSSNKdxDZWQlskhDWk7pjpI47qVkIY0pCENaUhD2v+QRqVII8ZMSLA8TzA8TxA8zyWwPJeA8lwCyXMJIM8lYDzH4nkDCM+xOdw3Lp5jcbi3sXk+8+I5No+LjOY5Fod7N4rn2BQOFx3H8/YvcS7x7PU27V3GVe7nQGFQDAEEcM65nTbE1CbGDkNS4tAXDUKREYbUYsIUJi3A/7+m3q77LjQfrg+sdnb2p'
        
        # Define region coordinates manually (like the working example)
        # Override config settings to match the working example
        regions = {
            'header': fitz.Rect(0, 0, page_rect.width, page_rect.height * 0.25),
            'service_lines': fitz.Rect(0, page_rect.height * 0.35, page_rect.width, page_rect.height * 0.8),
            'footer': fitz.Rect(0, page_rect.height * 0.8, page_rect.width, page_rect.height)
        }
        
        region_rect = regions[region_name]
        logger.info(f"Using region rect for {region_name}: {region_rect}")
        
        # Extract the region as an image with simpler approach like the working example
        try:
            logger.info(f"Extracting pixmap for region: {region_name}")
            pix = page.get_pixmap(clip=region_rect)  # No matrix specified like in example
            logger.info(f"Pixmap dimensions: {pix.width}x{pix.height}")
            img_data = pix.tobytes("png")
            img_base64 = base64.b64encode(img_data).decode()
            
            logger.info(f"Successfully extracted region {region_name}")
            return f'data:image/png;base64,{img_base64}'
        except Exception as e:
            logger.error(f"Error creating pixmap: {e}")
            # Try a different approach - render the whole page and then crop
            try:
                logger.info("Trying alternative approach - rendering whole page")
                pix = page.get_pixmap(matrix=fitz.Matrix(1, 1))
                # Create a new pixmap for the region
                region_pix = fitz.Pixmap(
                    pix.colorspace, 
                    (int(region_rect.width), int(region_rect.height)),
                    pix.alpha
                )
                region_pix.copy(pix, (int(region_rect.x0), int(region_rect.y0), int(region_rect.x1), int(region_rect.y1)))
                img_data = region_pix.tobytes("png")
                img_base64 = base64.b64encode(img_data).decode()
                logger.info("Alternative approach successful")
                return f'data:image/png;base64,{img_base64}'
            except Exception as e2:
                logger.error(f"Alternative approach failed: {e2}")
                raise
    except Exception as e:
        logger.error(f"Error extracting PDF region: {e}")
        import traceback
        logger.error(traceback.format_exc())
        # Return a placeholder image for error
        return f'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAAEsCAMAAABOo35HAAAAn1BMVEX///8AAADd3d3MzMypqalra2txcXF3d3eCgoKPj4+ampqmpqa5ubkQEBAgICAsLCw8PDxISEhQUFBYWFhnZ2dubm5/f3+IiIiQkJCYmJienp6lpaWwsLC9vb3Jycnr6+v19fUYGBgmJiY0NDRERERMTExiYmKDg4OLi4uTk5Obm5utra26urrDw8PQ0NDW1tbg4ODm5ub8/PwMDAwcHBzSAr3IAAAK2klEQVR42uzXgRpAQACGUW0qKrVNzVTM1Ps/m52xmXu/B+gA4GuFnzuVaqM9HsZsNfLDNpUz2k7m43Nx2vYhDWmVQBrSJnz6D0nfVHQ4R3RK15GNDSH7YAupSFvSPd/5ZiuHFKRUCVKQypCGNKQhDWlIQxrSkPaDNCqcTyENaVSSNKdxDZWQlskhDWk7pjpI47qVkIY0pCENaUhD2v+QRqVII8ZMSLA8TzA8TxA8zyWwPJeA8lwCyXMJIM8lYDzH4nkDCM+xOdw3Lp5jcbi3sXk+8+I5No+LjOY5Fod7N4rn2BQOFx3H8/YvcS7x7PU27V3GVe7nQGFQDAEEcM65nTbE1CbGDkNS4tAXDUKREYbUYsIUJi3A/7+m3q77LjQfrg+sdnb2p'