using System.Text.Json;
using backend.intex.DTOs.Common;
using backend.intex.Infrastructure.Auth;
using backend.intex.Infrastructure.Configuration;
using backend.intex.Infrastructure.Data;
using backend.intex.Infrastructure.Data.EntityFramework;
using backend.intex.Infrastructure.Extensions;
using backend.intex.Infrastructure.Middleware;
using backend.intex.Repositories.Abstractions;
using backend.intex.Repositories.Placeholder;
using backend.intex.Services.Abstractions;
using backend.intex.Services.Placeholder;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ApplicationModels;
using Microsoft.AspNetCore.HttpOverrides;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddApplicationConfiguration(builder.Configuration)
    .AddConfiguredCors(builder.Configuration, builder.Environment)
    .AddDatabaseInfrastructure(builder.Configuration)
    .AddJwtAuthentication(builder.Configuration, builder.Environment)
    .AddRoleBasedAuthorization()
    .AddApplicationServices()
    .AddScoped<IRepositoryMarker, RepositoryMarker>()
    .AddScoped<IServiceMarker, ServiceMarker>();

builder.Services.AddControllers(options =>
    {
        options.Conventions.Add(new ApiRoutePrefixConvention("api"));
    })
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var firstError = context.ModelState.Values
                .SelectMany(value => value.Errors)
                .Select(error => error.ErrorMessage)
                .FirstOrDefault(static message => !string.IsNullOrWhiteSpace(message))
                ?? "The request body is invalid.";

            return new BadRequestObjectResult(new ErrorResponse(firstError));
        };
    })
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });

builder.Services.Configure<Microsoft.AspNetCore.Http.Json.JsonOptions>(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.SerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
    options.SerializerOptions.PropertyNameCaseInsensitive = true;
});

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

builder.Services.Configure<ProblemDetailsOptions>(_ => { });
builder.Services.AddOpenApi();

var app = builder.Build();

app.UseForwardedHeaders();
app.UseMiddleware<JsonExceptionMiddleware>();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseCors(FrontendCorsOptions.PolicyName);
app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapControllers();

app.Run();
