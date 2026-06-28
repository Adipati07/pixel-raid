#!/usr/bin/env python3
"""Pixel Raid - Generate 20 hero sprites (64x64) matching the roster image."""
from PIL import Image, ImageDraw
import os

S = 64
OUT = "/home/ubuntu/pixel-raid/assets/heroes"
os.makedirs(OUT, exist_ok=True)

def px(d, x, y, c, sz=1):
    d.rectangle([x, y, x+sz-1, y+sz-1], fill=c)

def rect(d, x1, y1, x2, y2, c):
    d.rectangle([x1, y1, x2, y2], fill=c)

def draw_body(d, skin=(210,170,130), armor=None, pants=None):
    # Head
    rect(d, 26, 8, 37, 19, skin)
    # Eyes
    px(d, 28, 14, (255,255,255)); px(d, 29, 14, (255,255,255))
    px(d, 34, 14, (255,255,255)); px(d, 35, 14, (255,255,255))
    px(d, 29, 14, (40,40,60)); px(d, 35, 14, (40,40,60))
    # Mouth
    px(d, 30, 17, (180,120,100)); px(d, 31, 17, (180,120,100)); px(d, 32, 17, (180,120,100))
    # Neck
    rect(d, 30, 20, 33, 21, skin)
    # Torso
    tc = armor or (150,120,90)
    rect(d, 24, 22, 39, 37, tc)
    # Arms
    rect(d, 20, 22, 23, 35, skin)
    rect(d, 40, 22, 43, 35, skin)
    # Pants
    pc = pants or (80,70,60)
    rect(d, 26, 38, 32, 50, pc)
    rect(d, 33, 38, 37, 50, pc)
    # Boots
    rect(d, 25, 51, 32, 55, (60,50,40))
    rect(d, 33, 51, 39, 55, (60,50,40))

def draw_helmet(d, color, visor=None):
    rect(d, 23, 4, 40, 12, color)
    rect(d, 24, 12, 25, 16, color)
    rect(d, 38, 12, 39, 16, color)
    if visor:
        rect(d, 27, 12, 36, 15, visor)

def draw_hood(d, color):
    rect(d, 23, 4, 40, 12, color)
    rect(d, 23, 12, 26, 18, color)
    rect(d, 37, 12, 40, 18, color)

def draw_hair(d, color, style="short"):
    if style == "short":
        rect(d, 25, 5, 38, 10, color)
    elif style == "long":
        rect(d, 25, 5, 38, 10, color)
        rect(d, 24, 10, 26, 20, color)
        rect(d, 37, 10, 39, 20, color)
    elif style == "spiky":
        rect(d, 25, 5, 38, 9, color)
        px(d, 26, 3, color); px(d, 30, 2, color); px(d, 34, 3, color); px(d, 37, 4, color)
    elif style == "bald":
        pass

# ─── ROW 1 ───

def silver_knight():
    """Silver Knight - gleaming silver armor, sword & shield"""
    img = Image.new("RGBA", (S,S), (0,0,0,0))
    d = ImageDraw.Draw(img)
    # Silver helmet with blue visor
    draw_helmet(d, (180,185,200), visor=(60,80,140))
    # Silver plume on top
    rect(d, 30, 1, 33, 5, (220,225,240))
    px(d, 31, 0, (200,210,230))
    # Body in silver armor
    draw_body(d, skin=(200,180,160), armor=(160,165,180), pants=(140,145,160))
    # Chest plate detail
    rect(d, 28, 24, 35, 34, (190,195,210))
    px(d, 31, 28, (100,120,180)); px(d, 31, 29, (100,120,180))
    # Shield (left)
    rect(d, 10, 20, 20, 36, (170,175,190))
    rect(d, 12, 22, 18, 34, (190,195,210))
    px(d, 15, 27, (100,120,180))
    # Sword (right)
    rect(d, 44, 12, 46, 40, (210,215,230))
    rect(d, 42, 40, 48, 42, (180,170,80))
    rect(d, 44, 42, 46, 44, (100,90,50))
    # Shoulder guards
    rect(d, 20, 19, 24, 23, (180,185,200))
    rect(d, 39, 19, 43, 23, (180,185,200))
    return img

def arch_mage():
    """Arch Mage - grand wizard with starry robe and staff"""
    img = Image.new("RGBA", (S,S), (0,0,0,0))
    d = ImageDraw.Draw(img)
    # Long white hair
    draw_hair(d, (220,210,200), "long")
    # Tall wizard hat with stars
    rect(d, 26, -2, 37, 8, (60,40,120))
    rect(d, 29, -5, 34, -2, (70,50,130))
    px(d, 31, -6, (255,255,100))
    # Stars on hat
    px(d, 28, 0, (255,255,150)); px(d, 35, 2, (255,255,150)); px(d, 30, 4, (255,255,150))
    draw_body(d, skin=(210,190,170), armor=(60,40,120), pants=(50,35,100))
    # Robe extends down
    rect(d, 24, 37, 39, 55, (60,40,120))
    rect(d, 20, 30, 24, 50, (60,40,120))
    rect(d, 39, 30, 43, 50, (60,40,120))
    # Stars on robe
    px(d, 28, 30, (255,255,150)); px(d, 35, 35, (255,255,150)); px(d, 31, 42, (255,255,150))
    # Grand staff with crystal
    rect(d, 12, 8, 14, 55, (140,100,60))
    # Crystal orb on top
    rect(d, 9, 3, 17, 11, (100,60,200))
    rect(d, 10, 2, 16, 12, (140,80,230))
    px(d, 12, 5, (200,160,255)); px(d, 14, 7, (220,180,255))
    return img

def forest_warrior():
    """Forest Warrior - green armor, nature-themed with axe"""
    img = Image.new("RGBA", (S,S), (0,0,0,0))
    d = ImageDraw.Draw(img)
    # Green hood/helmet
    draw_hood(d, (40,100,40))
    draw_body(d, skin=(190,170,140), armor=(50,110,50), pants=(40,90,40))
    # Leaf shoulder pads
    rect(d, 19, 19, 24, 24, (60,130,50))
    rect(d, 39, 19, 44, 24, (60,130,50))
    px(d, 18, 18, (80,160,60)); px(d, 44, 18, (80,160,60))
    # Battle axe (right hand)
    rect(d, 44, 16, 46, 42, (120,90,50))
    # Axe head
    rect(d, 47, 14, 55, 22, (180,180,190))
    rect(d, 48, 15, 54, 21, (200,200,210))
    px(d, 50, 18, (160,160,170))
    # Vine details on armor
    px(d, 27, 25, (80,160,60)); px(d, 28, 27, (80,160,60)); px(d, 30, 29, (80,160,60))
    # Leaf cape
    rect(d, 22, 22, 24, 48, (40,100,40))
    rect(d, 39, 22, 41, 48, (40,100,40))
    return img

def kings_mage():
    """King's Mage - royal mage with crown and arcane staff"""
    img = Image.new("RGBA", (S,S), (0,0,0,0))
    d = ImageDraw.Draw(img)
    # Purple hair
    draw_hair(d, (120,60,160), "long")
    # Crown
    rect(d, 25, 3, 38, 8, (220,190,60))
    px(d, 27, 1, (220,190,60)); px(d, 31, 0, (255,220,80)); px(d, 35, 1, (220,190,60))
    # Gems on crown
    px(d, 29, 5, (200,40,40)); px(d, 33, 5, (40,40,200))
    draw_body(d, skin=(210,185,160), armor=(100,50,140), pants=(80,40,120))
    # Royal cape
    rect(d, 21, 22, 24, 52, (120,50,160))
    rect(d, 39, 22, 42, 52, (120,50,160))
    # Gold trim on robe
    rect(d, 24, 37, 39, 39, (220,190,60))
    rect(d, 24, 50, 39, 52, (220,190,60))
    # Arcane staff with golden orb
    rect(d, 12, 10, 14, 55, (160,120,60))
    rect(d, 9, 4, 17, 12, (220,190,60))
    rect(d, 10, 3, 16, 13, (240,210,80))
    px(d, 12, 6, (255,240,150)); px(d, 14, 8, (255,240,150))
    # Arcane runes
    px(d, 30, 26, (200,150,255)); px(d, 33, 30, (200,150,255)); px(d, 30, 34, (200,150,255))
    return img

def dark_sorcerer():
    """Dark Sorcerer - hooded figure with dark magic orbs"""
    img = Image.new("RGBA", (S,S), (0,0,0,0))
    d = ImageDraw.Draw(img)
    # Dark hood
    draw_hood(d, (40,20,50))
    # Face shadow with glowing red eyes
    rect(d, 27, 12, 36, 19, (20,10,25))
    px(d, 29, 14, (255,40,40)); px(d, 34, 14, (255,40,40))
    draw_body(d, skin=(140,130,150), armor=(40,20,50), pants=(30,15,40))
    # Dark robe extends
    rect(d, 24, 37, 39, 55, (40,20,50))
    rect(d, 20, 28, 24, 50, (40,20,50))
    rect(d, 39, 28, 43, 50, (40,20,50))
    # Dark magic orbs
    rect(d, 46, 20, 52, 26, (100,30,120))
    rect(d, 47, 19, 51, 27, (140,40,160))
    px(d, 49, 22, (200,100,255))
    # Second orb (left)
    rect(d, 8, 22, 14, 28, (100,30,120))
    rect(d, 9, 21, 13, 29, (140,40,160))
    px(d, 11, 25, (200,100,255))
    # Dark energy wisps
    px(d, 48, 16, (150,50,180)); px(d, 50, 14, (120,30,150))
    px(d, 10, 18, (150,50,180)); px(d, 8, 16, (120,30,150))
    return img

# ─── ROW 2 ───

def golem():
    """Golem - large stone creature with glowing core"""
    img = Image.new("RGBA", (S,S), (0,0,0,0))
    d = ImageDraw.Draw(img)
    # Large blocky body
    rect(d, 22, 6, 41, 20, (120,110,100))  # Head
    rect(d, 20, 20, 43, 42, (130,120,110))  # Torso
    rect(d, 16, 22, 20, 38, (120,110,100))  # Left arm
    rect(d, 43, 22, 47, 38, (120,110,100))  # Right arm
    rect(d, 22, 42, 31, 56, (110,100,90))   # Left leg
    rect(d, 32, 42, 41, 56, (110,100,90))   # Right leg
    # Cracks
    px(d, 28, 12, (80,70,60)); px(d, 29, 13, (80,70,60)); px(d, 30, 14, (80,70,60))
    px(d, 35, 10, (80,70,60)); px(d, 36, 11, (80,70,60))
    px(d, 30, 28, (80,70,60)); px(d, 31, 30, (80,70,60)); px(d, 32, 32, (80,70,60))
    # Glowing core in chest
    rect(d, 28, 26, 35, 33, (60,180,80))
    rect(d, 29, 27, 34, 32, (80,220,100))
    px(d, 31, 29, (150,255,170))
    # Glowing eyes
    px(d, 27, 10, (60,180,80)); px(d, 36, 10, (60,180,80))
    # Stone texture
    px(d, 24, 30, (140,130,120)); px(d, 38, 35, (140,130,120))
    px(d, 25, 45, (100,90,80)); px(d, 37, 48, (100,90,80))
    return img

def shadow_stalker():
    """Shadow Stalker - dark cloaked figure with daggers"""
    img = Image.new("RGBA", (S,S), (0,0,0,0))
    d = ImageDraw.Draw(img)
    # Dark hood
    draw_hood(d, (30,25,40))
    # Face shadow
    rect(d, 27, 12, 36, 19, (15,10,20))
    px(d, 29, 14, (180,160,255)); px(d, 34, 14, (180,160,255))
    draw_body(d, skin=(120,110,140), armor=(30,25,40), pants=(25,20,35))
    # Cloak
    rect(d, 22, 22, 24, 52, (30,25,40))
    rect(d, 39, 22, 41, 52, (30,25,40))
    rect(d, 24, 37, 39, 55, (30,25,40))
    # Dual daggers
    rect(d, 10, 24, 12, 40, (160,160,180))
    px(d, 11, 22, (200,200,220))
    rect(d, 51, 24, 53, 40, (160,160,180))
    px(d, 52, 22, (200,200,220))
    # Shadow wisps
    px(d, 18, 30, (60,40,80)); px(d, 45, 28, (60,40,80))
    px(d, 20, 45, (50,35,70)); px(d, 43, 42, (50,35,70))
    # Belt with pouches
    rect(d, 26, 36, 37, 38, (50,40,60))
    px(d, 28, 37, (80,60,100)); px(d, 35, 37, (80,60,100))
    return img

def ice_witch():
    """Ice Witch - frost queen with ice crystals"""
    img = Image.new("RGBA", (S,S), (0,0,0,0))
    d = ImageDraw.Draw(img)
    # Icy blue hair
    draw_hair(d, (150,200,240), "long")
    # Ice crown/tiara
    rect(d, 25, 3, 38, 7, (140,200,240))
    px(d, 27, 1, (180,230,255)); px(d, 31, 0, (200,240,255)); px(d, 35, 1, (180,230,255))
    # Skin (pale)
    rect(d, 26, 8, 37, 19, (220,225,240))
    px(d, 28, 14, (255,255,255)); px(d, 29, 14, (80,120,160))
    px(d, 34, 14, (255,255,255)); px(d, 35, 14, (80,120,160))
    px(d, 30, 17, (180,200,220)); px(d, 31, 17, (180,200,220)); px(d, 32, 17, (180,200,220))
    rect(d, 30, 20, 33, 21, (220,225,240))
    # Blue robe
    rect(d, 24, 22, 39, 55, (70,130,190))
    rect(d, 20, 22, 24, 50, (70,130,190))
    rect(d, 39, 22, 43, 50, (70,130,190))
    # Ice crystal staff
    rect(d, 12, 10, 14, 55, (140,180,220))
    # Crystal on top
    px(d, 11, 6, (180,230,255)); px(d, 12, 5, (200,240,255)); px(d, 13, 6, (180,230,255))
    px(d, 12, 7, (160,210,240)); px(d, 12, 4, (220,250,255))
    # Snowflake details on robe
    px(d, 30, 28, (180,230,255)); px(d, 33, 32, (180,230,255))
    px(d, 28, 38, (180,230,255)); px(d, 35, 42, (180,230,255))
    # Frost particles
    px(d, 8, 18, (200,230,255)); px(d, 50, 15, (200,230,255))
    px(d, 6, 25, (180,210,240)); px(d, 52, 22, (180,210,240))
    return img

def demon_hunter():
    """Demon Hunter - dark armor with demonic trophies"""
    img = Image.new("RGBA", (S,S), (0,0,0,0))
    d = ImageDraw.Draw(img)
    # Short dark hair
    draw_hair(d, (40,30,30), "short")
    # Leather eye patch (one eye)
    rect(d, 26, 13, 31, 16, (60,40,30))
    px(d, 34, 14, (255,255,255)); px(d, 35, 14, (180,40,40))
    # Dark leather armor
    draw_body(d, skin=(180,160,140), armor=(50,35,30), pants=(40,30,25))
    # Shoulder spikes (demon horns trophy)
    px(d, 20, 18, (180,40,40)); px(d, 19, 16, (200,50,50))
    px(d, 43, 18, (180,40,40)); px(d, 44, 16, (200,50,50))
    # Crossbow (right)
    rect(d, 44, 26, 60, 29, (100,80,50))
    d.line([(44,26),(40,18)], fill=(100,80,50), width=2)
    d.line([(44,29),(40,38)], fill=(100,80,50), width=2)
    # Bolt
    rect(d, 44, 27, 58, 28, (180,180,190))
    px(d, 59, 27, (200,50,50))
    # Demon skull necklace
    px(d, 30, 22, (200,180,160)); px(d, 31, 22, (200,180,160))
    px(d, 30, 23, (180,40,40)); px(d, 31, 23, (180,40,40))
    # Belt with demon teeth
    rect(d, 26, 36, 37, 38, (70,50,40))
    px(d, 28, 37, (200,180,160)); px(d, 32, 37, (200,180,160)); px(d, 35, 37, (200,180,160))
    return img

def slime_lord():
    """Slime Lord - amorphous slime creature with crown"""
    img = Image.new("RGBA", (S,S), (0,0,0,0))
    d = ImageDraw.Draw(img)
    # Slime body (blob shape)
    rect(d, 18, 14, 45, 50, (80,200,80))
    rect(d, 20, 10, 43, 14, (80,200,80))
    rect(d, 22, 8, 41, 10, (80,200,80))
    # Slimy shine
    rect(d, 22, 12, 26, 16, (120,230,120))
    rect(d, 36, 18, 40, 22, (120,230,120))
    # Darker core
    rect(d, 26, 22, 37, 40, (60,170,60))
    # Eyes (goofy)
    rect(d, 24, 18, 28, 24, (255,255,255))
    rect(d, 35, 18, 39, 24, (255,255,255))
    px(d, 25, 20, (30,30,30)); px(d, 36, 20, (30,30,30))
    # Crown on top
    rect(d, 24, 5, 39, 9, (220,190,60))
    px(d, 26, 3, (220,190,60)); px(d, 31, 2, (255,220,80)); px(d, 36, 3, (220,190,60))
    px(d, 29, 6, (200,40,40)); px(d, 33, 6, (40,40,200))
    # Slime drips
    rect(d, 18, 46, 22, 56, (80,200,80))
    rect(d, 30, 48, 34, 58, (80,200,80))
    rect(d, 41, 44, 45, 54, (80,200,80))
    # Pupils
    px(d, 26, 21, (200,255,200)); px(d, 37, 21, (200,255,200))
    return img

# ─── ROW 3 ───

def fire_wielder():
    """Fire Wielder - fire mage with flame sword"""
    img = Image.new("RGBA", (S,S), (0,0,0,0))
    d = ImageDraw.Draw(img)
    # Fiery red hair (spiky/flames)
    draw_hair(d, (220,80,20), "spiky")
    px(d, 26, 1, (255,120,30)); px(d, 30, 0, (255,160,40)); px(d, 34, 1, (255,100,20))
    draw_body(d, skin=(210,180,150), armor=(180,60,30), pants=(150,50,20))
    # Flame arm wraps
    rect(d, 20, 22, 23, 35, (200,80,30))
    rect(d, 40, 22, 43, 35, (200,80,30))
    # Flame sword (right)
    rect(d, 44, 14, 46, 40, (200,200,210))
    # Flames on sword
    px(d, 43, 10, (255,100,30)); px(d, 44, 9, (255,180,50)); px(d, 45, 8, (255,220,80))
    px(d, 46, 9, (255,120,30)); px(d, 47, 10, (255,80,20))
    px(d, 45, 11, (255,60,10)); px(d, 44, 12, (200,40,10))
    # Fire aura
    px(d, 18, 20, (255,100,30)); px(d, 45, 18, (255,100,30))
    px(d, 16, 28, (255,80,20)); px(d, 47, 26, (255,80,20))
    # Chest emblem (flame)
    px(d, 31, 26, (255,200,50)); px(d, 30, 28, (255,150,30)); px(d, 32, 28, (255,150,30))
    px(d, 31, 30, (255,100,20))
    return img

def stone_golem():
    """Stone Golem - massive stone creature with runes"""
    img = Image.new("RGBA", (S,S), (0,0,0,0))
    d = ImageDraw.Draw(img)
    # Massive stone body (bigger than regular golem)
    rect(d, 20, 4, 43, 18, (140,130,120))   # Head
    rect(d, 18, 18, 45, 40, (150,140,130))  # Torso
    rect(d, 12, 20, 18, 36, (140,130,120))  # Left arm
    rect(d, 45, 20, 51, 36, (140,130,120))  # Right arm
    rect(d, 20, 40, 30, 58, (130,120,110))  # Left leg
    rect(d, 33, 40, 43, 58, (130,120,110))  # Right leg
    # Stone texture cracks
    px(d, 26, 10, (100,90,80)); px(d, 27, 11, (100,90,80))
    px(d, 36, 8, (100,90,80)); px(d, 37, 9, (100,90,80))
    px(d, 28, 24, (100,90,80)); px(d, 29, 26, (100,90,80))
    px(d, 35, 30, (100,90,80)); px(d, 36, 32, (100,90,80))
    # Glowing rune eyes (blue)
    px(d, 26, 10, (80,120,255)); px(d, 37, 10, (80,120,255))
    # Rune on chest
    rect(d, 28, 24, 35, 32, (80,120,200))
    rect(d, 29, 25, 34, 31, (100,150,230))
    px(d, 31, 27, (150,200,255))
    # Rune markings on arms
    px(d, 15, 26, (80,120,200)); px(d, 15, 30, (80,120,200))
    px(d, 48, 26, (80,120,200)); px(d, 48, 30, (80,120,200))
    # Fists
    rect(d, 11, 34, 18, 38, (150,140,130))
    rect(d, 45, 34, 52, 38, (150,140,130))
    return img

def frost_giant():
    """Frost Giant - towering ice creature"""
    img = Image.new("RGBA", (S,S), (0,0,0,0))
    d = ImageDraw.Draw(img)
    # Massive ice body
    rect(d, 20, 2, 43, 16, (140,180,220))   # Head
    rect(d, 18, 16, 45, 38, (150,190,230))  # Torso
    rect(d, 12, 18, 18, 34, (140,180,220))  # Left arm
    rect(d, 45, 18, 51, 34, (140,180,220))  # Right arm
    rect(d, 20, 38, 30, 58, (130,170,210))  # Left leg
    rect(d, 33, 38, 43, 58, (130,170,210))  # Right leg
    # Ice crown/horns
    px(d, 22, 0, (180,220,255)); px(d, 24, -1, (200,230,255))
    px(d, 38, 0, (180,220,255)); px(d, 40, -1, (200,230,255))
    # Frozen eyes (glowing blue)
    px(d, 26, 8, (100,200,255)); px(d, 37, 8, (100,200,255))
    # Ice cracks on body
    px(d, 28, 20, (100,150,200)); px(d, 29, 22, (100,150,200))
    px(d, 35, 26, (100,150,200)); px(d, 36, 28, (100,150,200))
    # Frost breath
    px(d, 30, 14, (200,230,255)); px(d, 31, 14, (200,230,255)); px(d, 32, 14, (200,230,255))
    px(d, 29, 15, (180,210,240)); px(d, 33, 15, (180,210,240))
    # Ice fists
    rect(d, 11, 32, 18, 36, (160,200,240))
    rect(d, 45, 32, 52, 36, (160,200,240))
    # Icicle shoulder pads
    rect(d, 16, 14, 20, 20, (170,210,250))
    rect(d, 43, 14, 47, 20, (170,210,250))
    px(d, 18, 12, (200,230,255)); px(d, 45, 12, (200,230,255))
    return img

def dark_knight():
    """Dark Knight - menacing black armor with red accents"""
    img = Image.new("RGBA", (S,S), (0,0,0,0))
    d = ImageDraw.Draw(img)
    # Black helmet with red visor
    draw_helmet(d, (35,30,40), visor=(200,30,30))
    # Red plume
    rect(d, 30, 1, 33, 5, (180,30,30))
    px(d, 31, 0, (200,40,40))
    draw_body(d, skin=(140,130,140), armor=(30,25,35), pants=(25,20,30))
    # Red accents on armor
    rect(d, 28, 24, 35, 26, (180,30,30))
    rect(d, 30, 28, 33, 34, (160,25,25))
    # Dark sword
    rect(d, 44, 12, 46, 44, (70,60,80))
    rect(d, 42, 44, 48, 46, (150,25,25))
    rect(d, 44, 46, 46, 48, (60,50,40))
    # Shoulder spikes
    px(d, 20, 18, (60,50,70)); px(d, 19, 16, (70,60,80))
    px(d, 43, 18, (60,50,70)); px(d, 44, 16, (70,60,80))
    # Dark cape
    rect(d, 22, 22, 24, 52, (20,15,25))
    rect(d, 39, 22, 41, 52, (20,15,25))
    # Red glow from eyes
    px(d, 28, 13, (255,50,50)); px(d, 35, 13, (255,50,50))
    return img

def queens_guard():
    """Queen's Guard - elegant royal guard with spear"""
    img = Image.new("RGBA", (S,S), (0,0,0,0))
    d = ImageDraw.Draw(img)
    # White plumed helmet
    draw_helmet(d, (180,170,160), visor=(60,50,40))
    rect(d, 30, 0, 33, 5, (240,240,240))
    px(d, 31, -1, (255,255,255))
    draw_body(d, skin=(200,180,160), armor=(180,170,160), pants=(160,150,140))
    # Royal emblem on chest (gold lion)
    rect(d, 29, 25, 34, 33, (220,190,60))
    px(d, 30, 27, (240,210,80)); px(d, 33, 27, (240,210,80))
    px(d, 31, 29, (200,170,40)); px(d, 32, 31, (200,170,40))
    # Spear (left side)
    rect(d, 14, 4, 16, 56, (140,120,80))
    # Spear tip
    rect(d, 13, 2, 17, 6, (200,200,210))
    px(d, 15, 0, (220,220,230))
    # Gold trim
    rect(d, 24, 21, 39, 23, (220,190,60))
    rect(d, 24, 36, 39, 38, (220,190,60))
    # Shield (right)
    rect(d, 42, 22, 52, 36, (180,170,160))
    rect(d, 44, 24, 50, 34, (200,190,180))
    px(d, 47, 28, (220,190,60))
    # Boots with gold buckles
    rect(d, 25, 51, 32, 55, (60,50,40))
    rect(d, 33, 51, 39, 55, (60,50,40))
    px(d, 28, 52, (220,190,60)); px(d, 36, 52, (220,190,60))
    return img

# ─── ROW 4 ───

def dark_spirit():
    """Dark Spirit - ghostly wraith with ethereal form"""
    img = Image.new("RGBA", (S,S), (0,0,0,0))
    d = ImageDraw.Draw(img)
    # Ghostly body (semi-transparent effect via lighter colors)
    rect(d, 22, 6, 41, 18, (60,40,80))   # Head
    rect(d, 20, 18, 43, 38, (50,35,70))  # Torso
    rect(d, 18, 20, 20, 34, (55,38,75))  # Left arm
    rect(d, 43, 20, 45, 34, (55,38,75))  # Right arm
    # Wispy lower body
    rect(d, 22, 38, 30, 50, (45,30,65))
    rect(d, 33, 38, 41, 50, (45,30,65))
    rect(d, 20, 48, 28, 58, (40,25,60))
    rect(d, 35, 46, 43, 56, (40,25,60))
    # Glowing purple eyes
    px(d, 28, 10, (200,100,255)); px(d, 35, 10, (200,100,255))
    # Ethereal wisps
    px(d, 18, 14, (80,50,120)); px(d, 45, 12, (80,50,120))
    px(d, 16, 22, (70,45,110)); px(d, 47, 20, (70,45,110))
    px(d, 14, 30, (60,40,100)); px(d, 49, 28, (60,40,100))
    # Soul orbs floating
    px(d, 10, 16, (180,80,255)); px(d, 52, 14, (180,80,255))
    px(d, 8, 24, (160,60,230)); px(d, 54, 22, (160,60,230))
    # Dark energy core
    rect(d, 28, 24, 35, 32, (100,50,150))
    rect(d, 29, 25, 34, 31, (140,70,190))
    px(d, 31, 28, (200,120,255))
    return img

def king():
    """King - majestic ruler with crown and golden cape"""
    img = Image.new("RGBA", (S,S), (0,0,0,0))
    d = ImageDraw.Draw(img)
    # Regal beard and hair
    draw_hair(d, (160,130,80), "short")
    rect(d, 27, 17, 36, 21, (140,110,70))  # Beard
    # Golden crown with gems
    rect(d, 24, 3, 39, 8, (230,200,60))
    px(d, 26, 1, (230,200,60)); px(d, 31, 0, (255,230,80)); px(d, 36, 1, (230,200,60))
    px(d, 28, 5, (200,30,30)); px(d, 31, 5, (30,30,200)); px(d, 34, 5, (30,200,30))
    rect(d, 26, 8, 37, 19, (210,185,160))
    px(d, 28, 14, (255,255,255)); px(d, 29, 14, (40,40,60))
    px(d, 34, 14, (255,255,255)); px(d, 35, 14, (40,40,60))
    rect(d, 30, 20, 33, 21, (210,185,160))
    # Royal purple robe with gold trim
    rect(d, 24, 22, 39, 55, (80,40,120))
    rect(d, 20, 22, 24, 50, (80,40,120))
    rect(d, 39, 22, 43, 50, (80,40,120))
    # Gold trim
    rect(d, 24, 22, 39, 24, (230,200,60))
    rect(d, 24, 50, 39, 52, (230,200,60))
    rect(d, 30, 26, 33, 34, (230,200,60))
    # Royal scepter
    rect(d, 44, 10, 46, 50, (200,180,60))
    rect(d, 42, 6, 48, 12, (230,200,60))
    px(d, 45, 4, (255,230,100))
    # Golden cape
    rect(d, 22, 22, 24, 55, (200,170,50))
    rect(d, 39, 22, 41, 55, (200,170,50))
    return img

def princess():
    """Princess - elegant royal with healing magic"""
    img = Image.new("RGBA", (S,S), (0,0,0,0))
    d = ImageDraw.Draw(img)
    # Long flowing hair
    draw_hair(d, (220,180,140), "long")
    rect(d, 24, 10, 26, 28, (220,180,140))
    rect(d, 37, 10, 39, 28, (220,180,140))
    # Tiara
    rect(d, 26, 4, 37, 7, (220,200,100))
    px(d, 29, 2, (220,200,100)); px(d, 33, 2, (220,200,100))
    px(d, 31, 1, (255,230,120))
    px(d, 31, 4, (200,60,80))  # Ruby
    # Face (pretty)
    rect(d, 26, 8, 37, 19, (230,210,190))
    px(d, 28, 14, (255,255,255)); px(d, 29, 14, (80,120,160))
    px(d, 34, 14, (255,255,255)); px(d, 35, 14, (80,120,160))
    px(d, 30, 17, (220,100,120)); px(d, 31, 17, (220,100,120)); px(d, 32, 17, (220,100,120))
    rect(d, 30, 20, 33, 21, (230,210,190))
    # Pink/white dress
    rect(d, 24, 22, 39, 55, (230,180,200))
    rect(d, 20, 22, 24, 48, (230,180,200))
    rect(d, 39, 22, 43, 48, (230,180,200))
    # White trim
    rect(d, 24, 22, 39, 24, (255,240,245))
    rect(d, 24, 52, 39, 55, (255,240,245))
    # Healing magic (pink sparkles)
    px(d, 10, 18, (255,180,200)); px(d, 8, 20, (255,200,220))
    px(d, 52, 16, (255,180,200)); px(d, 54, 18, (255,200,220))
    px(d, 12, 14, (255,160,180)); px(d, 50, 12, (255,160,180))
    # Heart emblem
    px(d, 30, 28, (255,100,120)); px(d, 32, 28, (255,100,120))
    px(d, 29, 29, (255,120,140)); px(d, 33, 29, (255,120,140))
    px(d, 30, 30, (255,100,120)); px(d, 32, 30, (255,100,120))
    px(d, 31, 31, (255,80,100))
    return img

def dark_warlock():
    """Dark Warlock - cursed magic user with shadow flames"""
    img = Image.new("RGBA", (S,S), (0,0,0,0))
    d = ImageDraw.Draw(img)
    # Dark hood with horns
    draw_hood(d, (45,25,55))
    # Horns
    rect(d, 22, 0, 24, 6, (80,60,40))
    rect(d, 21, 0, 22, 4, (80,60,40))
    rect(d, 39, 0, 41, 6, (80,60,40))
    rect(d, 41, 0, 42, 4, (80,60,40))
    # Face shadow with glowing green eyes
    rect(d, 27, 12, 36, 19, (20,10,25))
    px(d, 29, 14, (100,255,100)); px(d, 34, 14, (100,255,100))
    draw_body(d, skin=(150,140,160), armor=(45,25,55), pants=(35,20,45))
    # Dark robe
    rect(d, 24, 37, 39, 55, (45,25,55))
    rect(d, 20, 28, 24, 50, (45,25,55))
    rect(d, 39, 28, 43, 50, (45,25,55))
    # Shadow flame in hands
    px(d, 46, 20, (100,50,150)); px(d, 47, 18, (140,70,190))
    px(d, 48, 16, (80,30,120)); px(d, 45, 22, (120,60,170))
    px(d, 10, 20, (100,50,150)); px(d, 9, 18, (140,70,190))
    px(d, 8, 16, (80,30,120)); px(d, 11, 22, (120,60,170))
    # Cursed book
    rect(d, 44, 30, 52, 38, (60,30,40))
    rect(d, 45, 31, 51, 37, (80,40,50))
    px(d, 48, 34, (200,50,50))
    # Dark runes floating
    px(d, 14, 10, (150,80,200)); px(d, 50, 8, (150,80,200))
    return img

def golden_paladin():
    """Golden Paladin - holy golden warrior with radiant shield"""
    img = Image.new("RGBA", (S,S), (0,0,0,0))
    d = ImageDraw.Draw(img)
    # Golden helmet with halo
    draw_helmet(d, (220,190,60), visor=(80,60,20))
    # Halo
    d.arc([27, 0, 36, 6], 0, 360, fill=(255,255,180), width=1)
    px(d, 31, -1, (255,255,200))
    draw_body(d, skin=(210,190,160), armor=(220,190,60), pants=(200,170,50))
    # Radiant chest plate
    rect(d, 28, 24, 35, 34, (240,210,80))
    # Cross emblem
    px(d, 31, 26, (255,255,200)); px(d, 31, 27, (255,255,200))
    px(d, 30, 27, (255,255,200)); px(d, 32, 27, (255,255,200))
    px(d, 31, 28, (255,255,200)); px(d, 31, 29, (255,255,200))
    # Golden shield (left)
    rect(d, 10, 20, 20, 36, (230,200,60))
    rect(d, 12, 22, 18, 34, (240,220,80))
    px(d, 15, 27, (255,255,200))
    # Holy sword with glow
    rect(d, 44, 10, 46, 42, (240,240,200))
    rect(d, 42, 42, 48, 44, (220,190,60))
    # Light particles
    px(d, 8, 16, (255,255,200)); px(d, 54, 14, (255,255,200))
    px(d, 6, 24, (255,255,180)); px(d, 56, 22, (255,255,180))
    # Shoulder guards with gold trim
    rect(d, 20, 19, 24, 24, (230,200,60))
    rect(d, 39, 19, 43, 24, (230,200,60))
    # Golden boots
    rect(d, 25, 51, 32, 55, (200,170,50))
    rect(d, 33, 51, 39, 55, (200,170,50))
    return img

# ─── GENERATE ALL ───

HEROES = [
    ("silver_knight", silver_knight),
    ("arch_mage", arch_mage),
    ("forest_warrior", forest_warrior),
    ("kings_mage", kings_mage),
    ("dark_sorcerer", dark_sorcerer),
    ("golem", golem),
    ("shadow_stalker", shadow_stalker),
    ("ice_witch", ice_witch),
    ("demon_hunter", demon_hunter),
    ("slime_lord", slime_lord),
    ("fire_wielder", fire_wielder),
    ("stone_golem", stone_golem),
    ("frost_giant", frost_giant),
    ("dark_knight", dark_knight),
    ("queens_guard", queens_guard),
    ("dark_spirit", dark_spirit),
    ("king", king),
    ("princess", princess),
    ("dark_warlock", dark_warlock),
    ("golden_paladin", golden_paladin),
]

if __name__ == "__main__":
    for name, gen_fn in HEROES:
        img = gen_fn()
        path = os.path.join(OUT, f"{name}.png")
        img.save(path)
        print(f"✅ {name}.png")
    print(f"\n🎯 Generated {len(HEROES)} hero sprites in {OUT}/")
