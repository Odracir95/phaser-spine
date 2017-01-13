module PhaserSpine {
    export module Canvas {
        export class Renderer {
            static QUAD_TRIANGLES = [0, 1, 2, 2, 3, 0];

            private game: Phaser.Game;

            constructor (game: Phaser.Game) {
                this.game = game;
            }

            public resize(bounds: Phaser.Rectangle, renderSession: PIXI.RenderSession): void {
                    var w = this.game.width;
                var h = this.game.height;

                // magic
                var centerX = bounds.x + bounds.width / 2;
                var centerY = bounds.y + bounds.height / 2;
                var scaleX = bounds.width / this.game.width;
                var scaleY = bounds.height / this.game.height;
                var scale = Math.max(scaleX, scaleY) * 1.2;
                var width = this.game.width * scale;
                var height = this.game.height * scale;

                (<any>renderSession.context).resetTransform();
                renderSession.context.scale(1 / scale, 1 / scale);
                renderSession.context.translate(-centerX, -centerY);
                renderSession.context.translate(width / 2, height / 2);
            }

            public drawImages (skeleton: spine.Skeleton, renderSession: PIXI.RenderSession) {
                let ctx = renderSession.context;
                let drawOrder = skeleton.drawOrder;

                if (SpinePlugin.DEBUG) ctx.strokeStyle = "green";

                for (let i = 0, n = drawOrder.length; i < n; i++) {
                    let slot = drawOrder[i];
                    let attachment = slot.getAttachment();
                    let region: spine.TextureAtlasRegion = null;
                    let image: HTMLImageElement = null;
                    let vertices: ArrayLike<number> = null;
                    if (attachment instanceof spine.RegionAttachment) {
                        let regionAttachment = <spine.RegionAttachment>attachment;
                        vertices = regionAttachment.updateWorldVertices(slot, false);
                        region = <spine.TextureAtlasRegion>regionAttachment.region;
                        image = (<Texture>(region).texture).getImage();

                    } else continue;

                    let att = <spine.RegionAttachment>attachment;
                    let bone = slot.bone;
                    let x = vertices[0];
                    let y = vertices[1];
                    let rotation = (bone.getWorldRotationX() - att.rotation) * Math.PI / 180;
                    let xx = vertices[24] - vertices[0];
                    let xy = vertices[25] - vertices[1];
                    let yx = vertices[8] - vertices[0];
                    let yy = vertices[9] - vertices[1];
                    let w = Math.sqrt(xx * xx + xy * xy), h = -Math.sqrt(yx * yx + yy * yy);
                    ctx.translate(x, y);
                    ctx.rotate(rotation);
                    if (region.rotate) {
                        ctx.rotate(Math.PI / 2);
                        ctx.drawImage(image, region.x, region.y, region.height, region.width, 0, 0, h, -w);
                        ctx.rotate(-Math.PI / 2);
                    } else {
                        ctx.drawImage(image, region.x, region.y, region.width, region.height, 0, 0, w, h);
                    }
                    if (SpinePlugin.DEBUG) ctx.strokeRect(0, 0, w, h);
                    ctx.rotate(-rotation);
                    ctx.translate(-x, -y);
                }
            }

            public drawTriangles (skeleton: spine.Skeleton, renderSession: PIXI.RenderSession) {
                let blendMode: spine.BlendMode = null;

                let vertices: ArrayLike<number> = null;
                let triangles: Array<number> = null;
                let drawOrder = skeleton.drawOrder;

                for (let i = 0, n = drawOrder.length; i < n; i++) {
                    let slot = drawOrder[i];
                    let attachment = slot.getAttachment();
                    let texture: HTMLImageElement = null;
                    let region: spine.TextureAtlasRegion = null;
                    if (attachment instanceof spine.RegionAttachment) {
                        let regionAttachment = <spine.RegionAttachment>attachment;
                        vertices = regionAttachment.updateWorldVertices(slot, false);
                        triangles = Renderer.QUAD_TRIANGLES;
                        region = <spine.TextureAtlasRegion>regionAttachment.region;
                        texture = (<Texture>region.texture).getImage();

                    } else if (attachment instanceof spine.MeshAttachment) {
                        let mesh = <spine.MeshAttachment>attachment;
                        vertices = mesh.updateWorldVertices(slot, false);
                        triangles = mesh.triangles;
                        texture = (<spine.TextureAtlasRegion>mesh.region.renderObject).texture.getImage();
                    } else continue;

                    if (texture != null) {
                        let slotBlendMode = slot.data.blendMode;
                        if (slotBlendMode != blendMode) {
                            blendMode = slotBlendMode;
                        }

                        let ctx = renderSession.context;

                        for (var j = 0; j < triangles.length; j+=3) {
                            let t1 = triangles[j] * 8, t2 = triangles[j+1] * 8, t3 = triangles[j+2] * 8;

                            let x0 = vertices[t1], y0 = vertices[t1 + 1], u0 = vertices[t1 + 6], v0 = vertices[t1 + 7];
                            let x1 = vertices[t2], y1 = vertices[t2 + 1], u1 = vertices[t2 + 6], v1 = vertices[t2 + 7];
                            let x2 = vertices[t3], y2 = vertices[t3 + 1], u2 = vertices[t3 + 6], v2 = vertices[t3 + 7];

                            this.drawTriangle(renderSession, texture, x0, y0, u0, v0, x1, y1, u1, v1, x2, y2, u2, v2);

                            if (SpinePlugin.DEBUG) {
                                ctx.strokeStyle = "green";
                                ctx.beginPath();
                                ctx.moveTo(x0, y0);
                                ctx.lineTo(x1, y1);
                                ctx.lineTo(x2, y2);
                                ctx.lineTo(x0, y0);
                                ctx.stroke();
                            }
                        }
                    }
                }
            }

            // Adapted from http://extremelysatisfactorytotalitarianism.com/blog/?p=2120
            // Apache 2 licensed
            private drawTriangle(renderSession: PIXI.RenderSession, img: HTMLImageElement, x0: number, y0: number, u0: number, v0: number,
                                 x1: number, y1: number, u1: number, v1: number,
                                 x2: number, y2: number, u2: number, v2: number) {
                let ctx = renderSession.context;

                u0 *= img.width;
                v0 *= img.height;
                u1 *= img.width;
                v1 *= img.height;
                u2 *= img.width;
                v2 *= img.height;

                ctx.beginPath();
                ctx.moveTo(x0, y0);
                ctx.lineTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.closePath();

                x1 -= x0;
                y1 -= y0;
                x2 -= x0;
                y2 -= y0;

                u1 -= u0;
                v1 -= v0;
                u2 -= u0;
                v2 -= v0;

                var det = 1 / (u1*v2 - u2*v1),

                // linear transformation
                    a = (v2*x1 - v1*x2) * det,
                    b = (v2*y1 - v1*y2) * det,
                    c = (u1*x2 - u2*x1) * det,
                    d = (u1*y2 - u2*y1) * det,

                // translation
                    e = x0 - a*u0 - c*v0,
                    f = y0 - b*u0 - d*v0;

                ctx.save();
                ctx.transform(a, b, c, d, e, f);
                ctx.clip();
                ctx.drawImage(img, 0, 0);
                ctx.restore();
            }
        }
    }
}