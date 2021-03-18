#
# Copyright (c) 2021 University of Dundee.
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as
# published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.
#

from django.http import HttpResponse, JsonResponse, StreamingHttpResponse
from django.core.urlresolvers import reverse
from django.template import loader
from django.templatetags import static
from django.shortcuts import render
from wsgiref.util import FileWrapper
import json
import zarr
from PIL import Image
from io import BytesIO
import base64
import numpy as np
import tempfile
import os

from omeroweb.webclient.decorators import login_required
from omeroweb.webgateway.marshal import channelMarshal

from omero.model.enums import PixelsTypeint8, PixelsTypeuint8, PixelsTypeint16
from omero.model.enums import PixelsTypeuint16, PixelsTypeint32
from omero.model.enums import PixelsTypeuint32, PixelsTypefloat
from omero.model.enums import PixelsTypecomplex, PixelsTypedouble

# @login_required()
def index(request, conn=None, **kwargs):
    """
    OMERO ImJoy Home page 
    """
    template = loader.get_template('omero_imjoy/index.html')
    html = template.render({}, request)
    # update links to static files
    static_dir = static.static('omero_imjoy/')
    html = html.replace('../../static/omero_imjoy/', static_dir)
    return HttpResponse(html)


def test(request, iid):
    print('test', iid)
    return render(request, 'omero_imjoy/zarr_test.html', {'iid': iid})


@login_required()
def zarr_zattrs(request, iid, conn=None, **kwargs):

    image = conn.getObject("Image", iid)

    rv = {
        "multiscales": [
            {
                "datasets": [
                    {
                        "path": "0"
                    }
                ],
                "version": "0.1"
            }
        ],
        "omero": {
            "channels": [channelMarshal(x) for x in image.getChannels()],
            "id": image.id,
            "rdefs": {
                "defaultT": image._re.getDefaultT(),
                "defaultZ": image._re.getDefaultZ(),
                "model": (image.isGreyscaleRenderingModel() and "greyscale" or "color"),
            }
        }
    }
    return JsonResponse(rv)


@login_required()
def zarr_zarray(request, iid, level, conn=None, **kwargs):

    image = conn.getObject("Image", iid)
    shape = [getattr(image, 'getSize' + dim)() for dim in ('TCZYX')]
    chunks = (1, 1, 1, shape[3], shape[4])

    ptype = image.getPrimaryPixels().getPixelsType().getValue()
    pixelTypes = {
        PixelsTypeint8: np.int8,
        PixelsTypeuint8: np.uint8,
        PixelsTypeint16: np.int16,
        PixelsTypeuint16: np.uint16,
        PixelsTypeint32: np.int32,
        PixelsTypeuint32: np.uint32,
        PixelsTypefloat: np.float32,
        PixelsTypedouble: np.float64
    }
    np_type = pixelTypes[ptype]

    rsp = {"data": "fail"}
    with tempfile.TemporaryDirectory() as tmpdirname:
        # writes zarray
        zarr.open_array(tmpdirname, mode='w', shape=tuple(shape), chunks=chunks, dtype=np_type)

        # reads zarray
        zattrs_path = os.path.join(tmpdirname, '.zarray')
        with open(zattrs_path, 'r') as reader:
            json_text = reader.read()
            rsp = json.loads(json_text)

    return JsonResponse(rsp)


@login_required()
def zarr_chunk(request, iid, level, t, c, z, y, x, conn=None, **kwargs):

    x, y, z, c, t = [int(dim) for dim in (x, y, z, c, t)]

    # NB: Assume that x and y are 0 and we are loading whole z, c, t plane
    image = conn.getObject("Image", iid)
    shape = [getattr(image, 'getSize' + dim)() for dim in ('TCZYX')]
    chunks = (1, 1, 1, shape[3], shape[4])

    plane = image.getPrimaryPixels().getPlane(z, c, t)
    data = ""
    chunk_name = ".".join([str(dim) for dim in [t, c, z, y, x]])
    with tempfile.TemporaryDirectory() as tmpdirname:
        # write chunk
        zarr_array = zarr.open_array(tmpdirname, mode='w', shape=tuple(shape), chunks=chunks, dtype=plane.dtype)
        zarr_array[t, c, z, :, :] = plane

        # reads zarray
        chunk_path = os.path.join(tmpdirname, chunk_name)
        with open(chunk_path, 'rb') as reader:
            data = reader.read()

    rsp = HttpResponse(data)
    rsp["Content-Length"] = len(data)
    rsp["Content-Disposition"] = "attachment; filename=%s" % chunk_name
    return rsp


@login_required(setGroupContext=True)
def save_image(request, conn=None, **kwargs):

    json_data = json.loads(request.body)

    img_data64 = json_data['data'].replace('data:image/png;base64,', '')
    im = Image.open(BytesIO(base64.b64decode(img_data64)))
    im.show()

    np_array = np.asarray(im)
    red = np_array[::, ::, 0]
    green = np_array[::, ::, 1]
    blue = np_array[::, ::, 2]
    plane_gen = iter([red, green, blue])
    new_image = conn.createImageFromNumpySeq(
        plane_gen,
        "Plot from OMERO.parade",
        sizeC=3)

    return JsonResponse({'image_id': new_image.id})
