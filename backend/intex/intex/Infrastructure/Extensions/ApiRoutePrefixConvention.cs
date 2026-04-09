using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ApplicationModels;

namespace backend.intex.Infrastructure.Extensions;

public sealed class ApiRoutePrefixConvention(string routePrefix) : IApplicationModelConvention
{
    private readonly AttributeRouteModel _prefix = new(new RouteAttribute(routePrefix));

    public void Apply(ApplicationModel application)
    {
        foreach (var controller in application.Controllers)
        {
            foreach (var selector in controller.Selectors.Where(static selector => selector.AttributeRouteModel is not null))
            {
                selector.AttributeRouteModel = AttributeRouteModel.CombineAttributeRouteModel(_prefix, selector.AttributeRouteModel);
            }
        }
    }
}
