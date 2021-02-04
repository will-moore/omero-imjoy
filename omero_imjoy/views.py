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

from django.http import HttpResponse
from django.core.urlresolvers import reverse
from django.template import loader
from django.templatetags import static
from django.shortcuts import render

from omeroweb.webclient.decorators import login_required

# @login_required()
def index(request, conn=None, **kwargs):
    """
    OMERO ImJoy Home page 
    """
    return render(request, 'omero_imjoy/index.html', {})
