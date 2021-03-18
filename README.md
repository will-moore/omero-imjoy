
# OMERO ImJoy

An experimental OMERO.web plugin to open images in ImageJ.JS.

Multi-dimensional images supported, but not 'Big' tiled images.

This uses [zarr-lite](https://github.com/manzt/zarr-lite) to load images as
zarr from OMERO.

See discussion at https://forum.image.sc/t/open-an-image-from-omero-in-imagej-js/47747/8

*NB: work in progress...*


# Dev install

This app is a plugin of OMERO.web and needs to be installed in the same environment.

    $ cd omero-imjoy
    $ pip install -e .

    $ omero config append omero.web.apps '"omero_imjoy"'

    # Then restart your omero-web server

To open a OMERO image, go to:

    your-omero-server/imjoy/?image=ID


# Dev testing without Django

    $ cd omero-imjoy
    $ python -m http.server

Go to http://localhost:8000/omero_imjoy/templates/omero_imjoy/index.html?source=https://s3.embassy.ebi.ac.uk/idr/zarr/v0.1/6001240.zarr


<img src="https://user-images.githubusercontent.com/900055/111672566-fe778780-8811-11eb-8a30-0a3b99cb1954.png"/>
