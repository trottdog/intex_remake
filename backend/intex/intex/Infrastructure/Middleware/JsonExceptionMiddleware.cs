using System.Text.Json;
using backend.intex.DTOs.Common;

namespace backend.intex.Infrastructure.Middleware;

public sealed class JsonExceptionMiddleware(RequestDelegate next, ILogger<JsonExceptionMiddleware> logger, IWebHostEnvironment environment)
{
    public async Task Invoke(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (JsonException exception)
        {
            logger.LogWarning(exception, "Invalid JSON payload.");
            await WriteErrorAsync(context, StatusCodes.Status400BadRequest, "The request body is invalid JSON.");
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Unhandled exception.");
            var message = environment.IsDevelopment()
                ? exception.Message
                : "An unexpected error occurred.";

            await WriteErrorAsync(context, StatusCodes.Status500InternalServerError, message);
        }
    }

    private static async Task WriteErrorAsync(HttpContext context, int statusCode, string message)
    {
        if (context.Response.HasStarted)
        {
            return;
        }

        context.Response.Clear();
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(new ErrorResponse(message));
    }
}
