using System.Net;
using Intex.Infrastructure.Api.Contracts;
using Intex.Infrastructure.Api.Errors;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Intex.Infrastructure.Api.Middleware;

public static class ApiExceptionHandlingMiddleware
{
    public static IApplicationBuilder UseApiExceptionHandling(this IApplicationBuilder app)
    {
        return app.UseExceptionHandler(exceptionHandlerApp =>
        {
            exceptionHandlerApp.Run(async context =>
            {
                var exceptionFeature = context.Features.Get<IExceptionHandlerPathFeature>();
                var exception = exceptionFeature?.Error;

                var (statusCode, message) = exception switch
                {
                    ApiException apiException => (apiException.StatusCode, apiException.Message),
                    BadHttpRequestException badRequestException => ((int)HttpStatusCode.BadRequest, badRequestException.Message),
                    _ => ((int)HttpStatusCode.InternalServerError, "Request failed")
                };

                context.Response.StatusCode = statusCode;
                context.Response.ContentType = "application/json";

                await context.Response.WriteAsJsonAsync(new ErrorResponse(message));
            });
        });
    }
}
