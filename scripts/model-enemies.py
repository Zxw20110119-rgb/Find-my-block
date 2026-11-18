"""Generate four enemy GLBs and eight-angle, transparent game atlases.

Run: blender -b -t 8 --python-exit-code 1 -P scripts/model-enemies.py
"""
import importlib.util
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

SCRIPT = Path(__file__).resolve()
spec = importlib.util.spec_from_file_location("tower_studio", SCRIPT.with_name("model-towers.py"))
studio = importlib.util.module_from_spec(spec)
sys.dont_write_bytecode = True
spec.loader.exec_module(studio)
box, cone, cylinder, ring = studio.box, studio.cone, studio.cylinder, studio.ring

def palette(armor, glow):
    material = studio.material
    return (
        material("Graphite chassis", "293043", .43, .4),
        material("Brushed alloy", "929DAF", .59, .36),
        material("Ceramic armor", armor, .26, .32),
        material("Energy indicator", glow, .09, .32, .85),
    )

def link(name, a, b, width, mat):
    """Place a machined strut between two points."""
    a, b = Vector(a), Vector(b)
    obj = box(name, (a+b)/2, (width,width,(b-a).length), mat, width*.2)
    obj.rotation_euler = (b-a).to_track_quat("Z", "Y").to_euler()
    return obj

def sensor(x, y, z, radius, dark, alloy, light):
    cylinder("Optic mount", (x,y,z), radius*1.18,.115,dark,16,(0,1,0))
    ring("Optic bezel", (x,y+.062,z), radius,.022,alloy,(0,1,0))
    cylinder("Active optic", (x,y+.065,z), radius*.83,.025,light,16,(0,1,0))

def scout():
    dark, alloy, armor, light = palette("D87A43", "FFD49D")
    cone("Hover chassis",(0,0,.53),.32,.47,.25,dark,8)
    cone("Scout shell",(0,0,.74),.47,.31,.28,armor,8)
    cylinder("Dorsal plate",(0,0,.899),.25,.07,alloy,8)
    ring("Ventral thrust ring",(0,0,.377),.24,.045,light)
    for side in (-1,1):
        x=side*.49
        box("Wing outrigger",(side*.33,-.035,.65),(.47,.18,.115),alloy,.029)
        box("Angular wing",(x,-.12,.65),(.225,.52,.19),armor,.055)
        cylinder("Lift pod",(side*.55,-.105,.525),.105,.14,dark,12)
        ring("Lift glow",(side*.55,-.105,.439),.069,.026,light)
        box("Wing light",(x,-.129,.759),(.11,.26,.025),light,.012)
    sensor(0,.385,.685,.12,dark,alloy,light)
    link("Angled antenna",(.14,-.11,.88),(.225,-.22,1.13),.052,dark)
    cylinder("Antenna beacon",(.225,-.22,1.14),.052,.065,light,10)

def runner():
    dark, alloy, armor, light = palette("E4AB39", "FFF29C")
    box("Low drive train",(0,-.03,.495),(.49,.91,.25),dark,.072)
    shell=box("Racing shell",(0,.02,.66),(.49,1.04,.26),armor,.079)
    shell.rotation_euler.x=.12
    box("Front visor",(0,.499,.641),(.315,.082,.12),dark,.026)
    box("Visor slit",(0,.545,.642),(.24,.018,.057),light,.01)
    box("Dorsal stripe",(0,-.07,.80),(.09,.61,.026),light,.011)
    for side in (-1,1):
        for end in (-1,1):
            a=(side*.205,end*.31,.5)
            b=(side*.50,end*.38-.10,.59)
            c=(side*.66,end*.51-.14,.105)
            link("Upper sprint leg",a,b,.14,armor)
            link("Lower sprint leg",b,c,.108,alloy)
            cylinder("Leg joint",b,.102,.125,dark,10,(1,0,0))
            box("Grip pad",(c[0],c[1]+.04,.065),(.15,.235,.105),dark,.029)

def tank():
    dark, alloy, armor, light = palette("8171AB", "D8BDFF")
    box("Heavy undercarriage",(0,0,.35),(1.12,1.13,.39),dark,.075)
    for side in (-1,1):
        x=side*.563
        box("Track belt",(x,0,.252),(.34,1.24,.43),dark,.115)
        for y in (-.39,-.13,.13,.39):
            cylinder("Track wheel",(side*.744,y,.247),.142,.044,alloy,12,(1,0,0))
            cylinder("Wheel hub",(side*.772,y,.247),.065,.022,dark,10,(1,0,0))
        for y in (-.53,-.36,-.18,0,.18,.36,.53):
            box("Tread grip",(x,y,.461),(.315,.073,.037),alloy,.014)
        box("Fender panel",(x,0,.516),(.38,1.12,.15),armor,.041)
        box("Fender stripe",(x,-.01,.60),(.103,.59,.028),light,.012)
    box("Layered hull",(0,-.025,.64),(.78,1.05,.42),armor,.12)
    box("Armored prow",(0,.561,.489),(.64,.212,.25),alloy,.053)
    cylinder("Sensor turret bearing",(0,-.065,.87),.26,.105,dark,12)
    box("Turret cap",(0,-.065,.984),(.46,.49,.21),armor,.061)
    sensor(0,.18,.989,.104,dark,alloy,light)
    for x in (-.226,.226):
        box("Forward marker",(x,.668,.521),(.091,.02,.063),light,.011)

def boss():
    dark, alloy, armor, light = palette("A02C5D", "FFADC2")
    gold = studio.material("Brass trim", "D99445", .49,.37)
    cone("Core carrier",(0,0,.31),.44,.58,.24,dark,8)
    box("Command torso",(0,0,.925),(.97,.66,.97),armor,.14)
    box("Chest shield",(0,.352,.935),(.68,.178,.58),dark,.091)
    sensor(0,.441,.948,.186,dark,gold,light)
    ring("Crown harness",(0,-.03,1.384),.365,.042,gold)
    box("Head armor",(0,.015,1.484),(.52,.44,.31),armor,.074)
    box("Crown visor",(0,.245,1.488),(.375,.052,.10),light,.02)
    for side in (-1,1):
        x=side*.65
        shoulder = box("Shoulder shield",(x,-.02,1.12),(.44,.64,.39),alloy,.104)
        shoulder.rotation_euler.y=side*.25
        box("Shoulder guard",(x*1.17,.02,1.103),(.24,.59,.32),armor,.069)
        link("Crown horn",(side*.312,-.065,1.361),(side*.55,-.19,1.88),.143,gold)
        cone("Horn cap",(side*.551,-.19,1.90),.101,0,.19,light,5,side*.27)
        box("Reactor flank",(side*.465,-.22,.835),(.17,.23,.45),light,.045)
        for y in (-.35,.35):
            a=(side*.38,y,.42)
            b=(side*.645,y*1.12,.38)
            c=(side*.76,y*1.48,.137)
            link("Stabilizer thigh",a,b,.24,dark)
            link("Stabilizer shin",b,c,.19,alloy)
            box("Heavy foot",(c[0],c[1],.113),(.27,.33,.19),armor,.055)
    for x in (-.17,0,.17):
        box("Back reactor fins",(x,-.39,.99),(.065,.078,.56),gold,.022)

if __name__ == "__main__":
    for kind, shape, scale, center in [
        ("scout",scout,1.69,.65),("runner",runner,2.36,.38),
        ("tank",tank,2.18,.45),("boss",boss,2.86,.86),
    ]:
        studio.render(kind,shape,output=SCRIPT.parents[1]/"public/assets/enemies",
                      frames_count=8,tile=176,scale=scale,center=center)
