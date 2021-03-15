
# OMERO ImJoy

An experimental OMERO.web plugin to open images in ImJoy and/or ImageJ.JS.

See discussion at https://forum.image.sc/t/open-an-image-from-omero-in-imagej-js/47747/8

*NB: work in progress...*


# Dev install

This app is a plugin of OMERO.web and needs to be installed in the same environment.

    $ cd omero-imjoy
    $ pip install -e .

    $ omero config append omero.web.apps '"omero_imjoy"'

    # Then restart your omero-web server


# Dev testing without Django

    $ cd omero-imjoy
    $ python -m http.server

Go to http://localhost:8000/omero_imjoy/templates/omero_imjoy/index.html?image=1
